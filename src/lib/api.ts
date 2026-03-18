// API Configuration and Helpers
import { API_BASE_URL, REQUEST_TIMEOUT, storage } from '@/config';

interface ApiError {
  message: string;
  status: number;
}

class ApiClient {
  private baseUrl: string;
  private isRefreshing = false;
  private failedQueue: Array<{
    resolve: (value: unknown) => void;
    reject: (reason?: unknown) => void;
  }> = [];

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private getHeaders(includeAuth: boolean = true): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (includeAuth) {
      const token = storage.getItem('access_token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    return headers;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const error: ApiError = {
        message: 'An error occurred',
        status: response.status,
      };

      try {
        const data = await response.json();
        // Backend wraps error responses in { success, message, data } structure
        error.message = data.message || data.error || data.data?.message || error.message;
      } catch {
        // Response might not be JSON
      }

      throw error;
    }

    const json = await response.json();

    // Check for business logic error (success: false) even if HTTP 200
    if (json && typeof json === 'object' && json.success === false) {
      const error: ApiError = {
        message: json.message || json.error || 'Operation failed',
        status: response.status,
      };
      throw error;
    }

    // Backend wraps responses in { success, message, data } structure
    // Extract the data field if it exists, otherwise return the full response
    return (json.data !== undefined ? json.data : json) as T;
  }

  private processQueue(error: Error | null, token: string | null = null) {
    this.failedQueue.forEach((prom) => {
      if (error) {
        prom.reject(error);
      } else {
        prom.resolve(token);
      }
    });

    this.failedQueue = [];
  }

  private handleLogout() {
    storage.removeItem('access_token');
    storage.removeItem('refresh_token');
    storage.removeItem('user');
    window.dispatchEvent(new CustomEvent('auth:logout'));
  }

  private async request<T>(
    method: string,
    endpoint: string,
    data?: unknown,
    includeAuth: boolean = true
  ): Promise<T> {
    const doRequest = async () => {
      const headers = this.getHeaders(includeAuth);
      const config: RequestInit = {
        method,
        headers,
        body: data ? JSON.stringify(data) : undefined,
      };

      // Add timeout using AbortController
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
      config.signal = controller.signal;

      try {
        return await fetch(`${this.baseUrl}${endpoint}`, config);
      } finally {
        clearTimeout(timeoutId);
      }
    };

    try {
      const response = await doRequest();

      // Handle 401 Unauthorized
      if (response.status === 401) {
        // If this is a login or refresh request, fail immediately
        if (endpoint.includes('/auth/tenant/login') || endpoint.includes('/auth/refresh')) {
          this.handleLogout();
          return this.handleResponse<T>(response);
        }

        // If it's change-password, 401 likely means incorrect old password, not invalid token.
        // Return response to be handled by caller (will throw due to success: false or !ok)
        if (endpoint.includes('/change-password')) {
          return this.handleResponse<T>(response);
        }

        if (this.isRefreshing) {
          // If already refreshing, queue this request
          return new Promise((resolve, reject) => {
            this.failedQueue.push({ resolve, reject });
          }).then(() => {
            return this.request<T>(method, endpoint, data, includeAuth);
          });
        }

        const refreshToken = storage.getItem('refresh_token');
        if (!refreshToken) {
          this.handleLogout();
          return this.handleResponse<T>(response);
        }

        this.isRefreshing = true;

        try {
          // Attempt to refresh token
          const refreshResponse = await fetch(`${this.baseUrl}/api/v1/auth/refresh`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ refresh_token: refreshToken }),
          });

          if (!refreshResponse.ok) {
            throw new Error('Refresh failed');
          }

          const refreshData = await refreshResponse.json();
          const newAccessToken = refreshData.data?.access_token || refreshData.access_token;

          if (newAccessToken) {
            storage.setItem('access_token', newAccessToken);
            // Retry original request
            this.isRefreshing = false;
            this.processQueue(null, newAccessToken);
            return this.request<T>(method, endpoint, data, includeAuth);
          } else {
            throw new Error('No access token in refresh response');
          }
        } catch (error) {
          this.isRefreshing = false;
          this.processQueue(error as Error);
          this.handleLogout();
          throw error;
        }
      }

      return this.handleResponse<T>(response);
    } catch (error) {
      // Handle timeout and abort errors
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error(`Request timeout after ${REQUEST_TIMEOUT}ms`);
        }
      }
      throw error;
    }
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>('GET', endpoint);
  }

  async post<T>(endpoint: string, data?: unknown, includeAuth: boolean = true): Promise<T> {
    return this.request<T>('POST', endpoint, data, includeAuth);
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>('DELETE', endpoint);
  }
}

export const api = new ApiClient(API_BASE_URL);

// Auth Types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token?: string; // Refresh endpoint doesn't return refresh_token
  expires_in: number;
  user?: {
    id: string;
    email: string;
    full_name?: string;
    company_name?: string;
    user_type?: string;
    must_change_password?: boolean;
  };
}

// File Types
export interface FileItem {
  id: string;
  tenant_id: string;
  original_filename: string;
  stored_filename: string;
  s3_key: string;
  file_size: number;
  mime_type: string;
  upload_to: 'root' | 'uploads' | 'assets' | 'schedules';
  upload_status: 'pending' | 'completed' | 'failed';
  upload_completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface UploadUrlResponse {
  file_id: string;
  upload_url: string;
  expires_at: string;
}

export interface DownloadUrlResponse {
  download_url: string;
  expires_at: string;
}

// Sync Token Types
export interface SyncToken {
  id: string;
  name: string;
  token?: string;
  can_read: boolean;
  can_write: boolean;
  can_delete: boolean;
  last_used_at?: string;
  expires_at: string;
  created_at: string;
}

export interface SyncTokenStats {
  total_requests: number;
  files_uploaded: number;
  files_downloaded: number;
  bytes_transferred: number;
}

// Auth API
export const authApi = {
  login: (data: LoginRequest) =>
    api.post<AuthResponse>('/api/v1/auth/tenant/login', data, false),

  refresh: (refreshToken: string) =>
    api.post<AuthResponse>('/api/v1/auth/refresh', { refresh_token: refreshToken }, false),

  logout: (refreshToken: string) =>
    api.post('/api/v1/auth/logout', { refresh_token: refreshToken }),
};

// Files API
export const filesApi = {
  list: () => api.get<FileItem[]>('/api/v1/files'),

  uploadFile: (file: File, uploadTo: string = 'root', onProgress?: (progress: number) => void): Promise<unknown> => {
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_to', uploadTo);

      const xhr = new XMLHttpRequest();
      const token = storage.getItem('access_token');

      // Add timeout
      const timeoutId = setTimeout(() => {
        xhr.abort();
        reject(new Error(`Upload timeout after ${REQUEST_TIMEOUT}ms`));
      }, REQUEST_TIMEOUT);

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable && onProgress) {
          const percentComplete = Math.round((e.loaded / e.total) * 100);
          onProgress(percentComplete);
        }
      });

      xhr.addEventListener('load', () => {
        clearTimeout(timeoutId);
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve(response);
          } catch {
            resolve(xhr.responseText);
          }
        } else {
          reject(new Error(`Upload failed: ${xhr.status} ${xhr.statusText}`));
        }
      });

      xhr.addEventListener('error', () => {
        clearTimeout(timeoutId);
        reject(new Error('Network error during upload'));
      });

      xhr.addEventListener('abort', () => {
        clearTimeout(timeoutId);
        reject(new Error('Upload was aborted'));
      });

      xhr.open('POST', `${API_BASE_URL}/api/v1/files/upload`);
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }

      xhr.send(formData);
    });
  },

  generateUploadUrl: (filename: string, fileSize: number, mimeType: string, uploadTo?: string) =>
    api.post<UploadUrlResponse>('/api/v1/files/upload-url', {
      filename,
      file_size: fileSize,
      mime_type: mimeType,
      upload_to: uploadTo || 'root',
    }),

  completeUpload: (fileId: string) =>
    api.post('/api/v1/files/complete-upload', { file_id: fileId }),

  getDownloadUrl: (fileId: string) =>
    api.get<DownloadUrlResponse>(`/api/v1/files/${fileId}/download-url`),

  delete: (fileId: string) => api.delete(`/api/v1/files/${fileId}`),
};

// Tenant Profile Types
export interface TenantProfile {
  id: string;
  email: string;
  full_name: string;
  company_name: string;
  password_changed_at: string;
  must_change_password: boolean;
  is_active: boolean;
  s3_prefix: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  last_login_at?: string;
  last_login_ip?: string;
}

// Sync Tokens API
export const syncTokensApi = {
  list: () => api.get<SyncToken[]>('/api/v1/tenant/sync-tokens'),

  get: (tokenId: string) => api.get<SyncToken>(`/api/v1/tenant/sync-tokens/${tokenId}`),

  getStats: (tokenId: string) =>
    api.get<SyncTokenStats>(`/api/v1/tenant/sync-tokens/${tokenId}/stats`),
};

// Tenant Profile API
export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}

export const tenantApi = {
  getProfile: () => api.get<TenantProfile>('/api/v1/tenant/profile'),

  changePassword: (data: ChangePasswordRequest) =>
    api.post('/api/v1/tenant/change-password', data),
};

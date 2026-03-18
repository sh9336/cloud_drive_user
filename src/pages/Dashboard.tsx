import { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { filesApi, FileItem } from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Upload,
  Download,
  Trash2,
  FileText,
  FileImage,
  FileVideo,
  File as FileIcon,
  Loader2,
  RefreshCw,
  Folder,
  FolderOpen,
  X,
  CheckCircle2,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

type FolderType = 'root' | 'uploads' | 'assets' | 'schedules';

interface FolderInfo {
  name: string;
  path: FolderType;
  description: string;
  fileCount: number;
}

interface UploadQueueItem {
  file: File;
  id: string; // unique internal id for list management
  status: 'idle' | 'pending' | 'uploading' | 'success' | 'error';
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) return FileImage;
  if (mimeType.startsWith('video/')) return FileVideo;
  if (mimeType.includes('pdf') || mimeType.includes('document')) return FileText;
  return FileIcon;
}

export default function Dashboard() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);

  // Multi-file upload state using a queue
  const [uploadQueue, setUploadQueue] = useState<UploadQueueItem[]>([]);

  const [selectedUploadFolder, setSelectedUploadFolder] = useState<FolderType>('root');
  const [currentFolder, setCurrentFolder] = useState<FolderType | null>(null);
  const { toast } = useToast();

  const fetchFiles = useCallback(async () => {
    try {
      const data = await filesApi.list();
      setFiles(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch files:', error);
      toast({
        title: 'Error',
        description: 'Failed to load files. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  // Organize files by folder
  const rootFiles = files.filter((f) => f.upload_to === 'root');
  const uploadsFiles = files.filter((f) => f.upload_to === 'uploads');
  const assetsFiles = files.filter((f) => f.upload_to === 'assets');
  const schedulesFiles = files.filter((f) => f.upload_to === 'schedules');

  const folders: FolderInfo[] = [
    {
      name: 'Uploads',
      path: 'uploads',
      description: 'User-uploaded files',
      fileCount: uploadsFiles.length,
    },
    {
      name: 'Assets',
      path: 'assets',
      description: 'Static assets and resources',
      fileCount: assetsFiles.length,
    },
    {
      name: 'Schedules',
      path: 'schedules',
      description: 'Schedule and sync configuration files',
      fileCount: schedulesFiles.length,
    },
  ];

  const currentFiles = currentFolder
    ? files.filter((f) => f.upload_to === currentFolder)
    : rootFiles;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      if (newFiles.length > 3) {
        toast({
          title: 'Too many files',
          description: 'You can only upload up to 3 files at a time.',
          variant: 'destructive',
        });
        // Slice to max 3
        newFiles.splice(3);
      }

      const newQueue: UploadQueueItem[] = newFiles.map(file => ({
        file,
        id: Math.random().toString(36).substring(7),
        status: 'idle'
      }));

      setUploadQueue(newQueue);
      setUploadProgress(0);
    }
  };

  const removeQueueItem = (id: string) => {
    if (isUploading) return;
    setUploadQueue(prev => prev.filter(item => item.id !== id));
  };

  const handleUpload = async () => {
    if (uploadQueue.length === 0) return;

    setIsUploading(true);

    // Mark all as pending initially
    setUploadQueue(prev => prev.map(item => ({ ...item, status: 'pending' })));

    let successCount = 0;
    let failCount = 0;

    // Process queue sequentially
    const queueIds = uploadQueue.map(item => item.id);

    for (let i = 0; i < queueIds.length; i++) {
      const itemId = queueIds[i];
      const currentItem = uploadQueue.find(item => item.id === itemId);
      if (!currentItem) continue;

      const file = currentItem.file;

      // Update status to uploading
      setUploadQueue(prev => prev.map(item =>
        item.id === itemId ? { ...item, status: 'uploading' } : item
      ));
      setUploadProgress(0);

      try {
        // Upload file directly to backend (backend handles S3 upload internally)
        await filesApi.uploadFile(
          file,
          selectedUploadFolder,
          (progress) => setUploadProgress(progress)
        );

        // Update status to success
        setUploadQueue(prev => prev.map(item =>
          item.id === itemId ? { ...item, status: 'success' } : item
        ));
        successCount++;

      } catch (error) {
        console.error(`=== UPLOAD FAILED FOR FILE: ${file.name} ===`);
        console.error('Error Details:', error);

        if (error instanceof Error) {
          console.error('Error Message:', error.message);
          console.error('Error Stack:', error.stack);
        }

        // Update status to error
        setUploadQueue(prev => prev.map(item =>
          item.id === itemId ? { ...item, status: 'error' } : item
        ));
        failCount++;
      }
    }

    setUploadProgress(100);

    // Final status toast
    if (failCount === 0) {
      toast({
        title: 'Batch upload complete',
        description: `Successfully uploaded ${successCount} file(s) to ${selectedUploadFolder}.`,
      });
    } else {
      toast({
        title: 'Uploads completed with errors',
        description: `${successCount} succeeded, ${failCount} failed.`,
        variant: 'destructive',
      });
    }

    // Wait a moment so user can see the checkmarks before closing
    setTimeout(() => {
      setUploadDialogOpen(false);
      setUploadQueue([]);
      setUploadProgress(0);
      fetchFiles();
      setIsUploading(false);
    }, 1500);
  };

  const handleDownload = async (file: FileItem) => {
    try {
      const { download_url } = await filesApi.getDownloadUrl(file.id);
      window.open(download_url, '_blank');
    } catch (error) {
      console.error('Download failed:', error);
      toast({
        title: 'Download failed',
        description: 'Could not generate download link.',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (file: FileItem) => {
    try {
      await filesApi.delete(file.id);
      toast({
        title: 'File deleted',
        description: `${file.original_filename} has been deleted.`,
      });
      fetchFiles();
    } catch (error) {
      console.error('Delete failed:', error);
      toast({
        title: 'Delete failed',
        description: 'Could not delete the file.',
        variant: 'destructive',
      });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 flex flex-col">
        {/* Header - Clean & Modern */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <h2 className="text-3xl font-bold tracking-tight text-foreground">
              {currentFolder ? (
                <div className="flex items-center gap-3 text-lg md:text-3xl">
                  <span
                    onClick={() => setCurrentFolder(null)}
                    className="cursor-pointer hover:text-primary transition-colors duration-200"
                  >
                    Files
                  </span>
                  <span className="text-muted-foreground/30">/</span>
                  <span className="text-primary font-semibold">{currentFolder}</span>
                </div>
              ) : (
                'Files'
              )}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={fetchFiles} className="h-9 w-9 hover:bg-muted/50 transition-colors" title="Refresh">
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button
              onClick={() => {
                setSelectedUploadFolder(currentFolder || 'root');
                setUploadDialogOpen(true);
              }}
              className="h-9 px-4 font-medium hover:shadow-md transition-shadow"
            >
              <Upload className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Upload</span>
              <span className="sm:hidden">Add</span>
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/30" />
          </div>
        ) : currentFolder ? (
          /* Folder View - Minimalist List */
          <div className="rounded-lg border bg-card/50 shadow-sm flex flex-col">
            {currentFiles.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-12 space-y-4">
                <div className="mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-secondary/50">
                  <Folder className="h-8 w-8 text-muted-foreground/40" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-foreground">Folder is empty</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">
                    Click upload to add files to this folder.</p>
                </div>
                <Button
                  variant="outline"
                  className="mt-4 h-8 text-sm font-medium"
                  onClick={() => {
                    setSelectedUploadFolder(currentFolder || 'root');
                    setUploadDialogOpen(true);
                  }}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Upload File
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {currentFiles.map((file) => {
                  const FileIcon = getFileIcon(file.mime_type);
                  return (
                    <div
                      key={file.id}
                      className="group flex items-center justify-between p-3 px-4 hover:bg-muted/40 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-secondary/30 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-all">
                          <FileIcon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                            {file.original_filename}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground/70">
                            <span className="font-medium">{formatFileSize(file.file_size)}</span>
                            <span>•</span>
                            <span>{formatDate(file.created_at)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted/50"
                          onClick={() => handleDownload(file)}
                          disabled={file.upload_status !== 'completed'}
                          title="Download"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-red-50 dark:hover:bg-red-950/20"
                          onClick={() => handleDelete(file)}
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* Root View - Split Layout */
          <div className="flex flex-col gap-6">

            {/* FOLDERS Grid - Modern Cards */}
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest px-1 mt-2">Folders</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {folders.map((folder) => (
                <button
                  key={folder.path}
                  onClick={() => setCurrentFolder(folder.path)}
                  className="flex flex-col gap-2 p-3 rounded-lg border bg-card/50 hover:bg-card hover:border-primary/20 hover:shadow-sm transition-all text-left"
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="p-1.5 rounded-md bg-primary/10 text-primary">
                      {folder.fileCount > 0 ? (
                        <FolderOpen className="h-4 w-4" />
                      ) : (
                        <Folder className="h-4 w-4" />
                      )}
                    </div>
                    <span className="text-[10px] font-medium text-muted-foreground bg-secondary/50 px-1.5 py-0.5 rounded-full">
                      {folder.fileCount}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{folder.name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{folder.description}</p>
                  </div>
                </button>
              ))}
              </div>
            </div>

            {/* ROOT FILES List - Modern */}
            <div className="rounded-lg border bg-card/50 shadow-sm flex flex-col">
              <div className="px-4 py-3 border-b border-border/50 bg-muted/20">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Root Files</h3>
              </div>

              {rootFiles.length === 0 ? (
                <div className="p-12 text-center space-y-2">
                  <p className="text-sm text-muted-foreground">No files in root directory yet</p>
                </div>
              ) : (
                <div className="divide-y divide-border/50">
                  {rootFiles.map((file) => {
                    const FileIcon = getFileIcon(file.mime_type);
                    return (
                      <div
                        key={file.id}
                        className="group flex items-center justify-between p-2 px-4 hover:bg-muted/40 transition-colors"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-secondary/30 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-all">
                            <FileIcon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                              {file.original_filename}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground/70">
                              <span className="font-medium">{formatFileSize(file.file_size)}</span>
                              <span>•</span>
                              <span>{formatDate(file.created_at)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted/50"
                            onClick={() => handleDownload(file)}
                            disabled={file.upload_status !== 'completed'}
                            title="Download"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-red-50 dark:hover:bg-red-950/20"
                            onClick={() => handleDelete(file)}
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col gap-0 p-0 overflow-hidden">
          <DialogHeader className="p-5 pb-3 border-b border-border/50 bg-muted/20">
            <DialogTitle className="text-lg font-bold tracking-tight">Upload Files</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Select up to 3 files to upload at once.
            </DialogDescription>
          </DialogHeader>

          <div className="p-4 space-y-4 overflow-y-auto">
            <div className="flex items-center gap-3">
              <label className="text-xs font-medium whitespace-nowrap">Destination:</label>
              <Select
                value={selectedUploadFolder}
                onValueChange={(value) => setSelectedUploadFolder(value as FolderType)}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="root">Root</SelectItem>
                  <SelectItem value="uploads">Uploads</SelectItem>
                  <SelectItem value="assets">Assets</SelectItem>
                  <SelectItem value="schedules">Schedules</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {!isUploading && (
              <div
                className={cn(
                  'relative flex flex-col items-center justify-center rounded-md border border-dashed py-6 px-4 transition-colors',
                  uploadQueue.length > 0
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-muted-foreground/50'
                )}
              >
                <div className="text-center space-y-1">
                  <Upload className="mx-auto h-8 w-8 text-muted-foreground/60" />
                  <p className="text-sm font-semibold text-muted-foreground">Click or drag files here</p>
                  <p className="text-xs text-muted-foreground/60">Max 3 files at a time</p>
                </div>
                <input
                  type="file"
                  multiple
                  className="absolute inset-0 cursor-pointer opacity-0"
                  onChange={handleFileSelect}
                  disabled={isUploading}
                />
              </div>
            )}

            {uploadQueue.length > 0 && (
              <div className="border rounded-md divide-y bg-muted/10">
                {uploadQueue.map((item) => (
                  <div key={item.id} className="p-3 relative group">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-muted-foreground",
                        item.status === 'success' && "bg-green-100 text-green-600 dark:bg-green-900/30",
                        item.status === 'error' && "bg-red-100 text-red-600 dark:bg-red-900/30",
                        item.status === 'uploading' && "bg-primary/10 text-primary"
                      )}>
                        {item.status === 'success' ? <CheckCircle2 className="h-4 w-4" /> :
                          item.status === 'error' ? <AlertCircle className="h-4 w-4" /> :
                            <FileIcon className="h-4 w-4" />}
                      </div>

                      <div className="flex-1 min-w-0 grid gap-1">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold truncate pr-2">{item.file.name}</p>
                          <span className="text-xs text-muted-foreground shrink-0 font-medium">{formatFileSize(item.file.size)}</span>
                        </div>

                        <div className="h-2 w-full flex items-center">
                          {item.status === 'uploading' ? (
                            <div className="w-full flex items-center gap-2">
                              <Progress value={uploadProgress} className="h-2 flex-1" />
                              <span className="text-xs tabular-nums font-medium">{uploadProgress}%</span>
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground">
                              {item.status === 'pending' && <span className="flex items-center gap-1 text-yellow-600 dark:text-yellow-500"><Clock className="h-3 w-3" /> Waiting...</span>}
                              {item.status === 'success' && <span className="text-green-600 dark:text-green-400 font-medium">Completed</span>}
                              {item.status === 'error' && <span className="text-destructive font-medium">Failed</span>}
                              {item.status === 'idle' && "Ready to upload"}
                            </p>
                          )}
                        </div>
                      </div>

                      {item.status === 'idle' && !isUploading && (
                        <button
                          className="ml-2 p-1 text-muted-foreground/50 hover:text-destructive hover:bg-red-50 dark:hover:bg-red-950/20 rounded transition-colors"
                          onClick={() => removeQueueItem(item.id)}
                          title="Remove"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter className="p-4 pt-3 border-t border-border/50 mt-auto gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setUploadDialogOpen(false);
                setUploadQueue([]);
                setUploadProgress(0);
              }}
              disabled={isUploading}
              className="h-9 text-sm font-medium"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={uploadQueue.length === 0 || isUploading}
              className="h-9 text-sm font-medium hover:shadow-md transition-shadow"
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-3.5 w-3.5" />
                  Start Upload
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

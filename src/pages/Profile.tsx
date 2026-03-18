import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { tenantApi, TenantProfile } from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, User, Mail, Building2, Calendar, Key, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function Profile() {
  const [profile, setProfile] = useState<TenantProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [changePasswordDialogOpen, setChangePasswordDialogOpen] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Password Visibility States
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordError, setPasswordError] = useState('');
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setIsLoading(true);
        const data = await tenantApi.getProfile();
        setProfile(data);
      } catch (error) {
        console.error('Failed to fetch profile:', error);
        toast({
          title: 'Error',
          description: 'Failed to load profile. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [toast]);

  const handleChangePassword = async () => {
    setPasswordError('');

    // Validation
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      setPasswordError('All fields are required');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters long');
      return;
    }

    // Strong password validation to prevent backend errors
    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!strongPasswordRegex.test(passwordData.newPassword)) {
      setPasswordError('Password must contain: 1 uppercase, 1 lowercase, 1 number, and 1 special char (@$!%*?&)');
      return;
    }

    setIsChangingPassword(true);
    console.log('Starting password change request...');

    try {
      await tenantApi.changePassword({
        current_password: passwordData.currentPassword,
        new_password: passwordData.newPassword,
      });
      console.log('Password change success');

      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });

      setChangePasswordDialogOpen(false);

      toast({
        title: 'Password Changed',
        description: 'Logging out for security...',
      });

      // Logout and redirect
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Password change failed:', error);

      let errorMessage = 'Failed to change password.';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null && 'message' in error) {
        errorMessage = String((error as { message?: unknown }).message ?? '');
      } else if (typeof error === 'string') {
        errorMessage = error;
      }

      setPasswordError(errorMessage);
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  if (!profile) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-20">
          <p className="text-muted-foreground">Failed to load profile</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 flex flex-col">
        {/* Header - Clean & Modern */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-foreground">Profile Settings</h2>
            <p className="mt-1 text-sm text-muted-foreground">Manage your account and security preferences</p>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setChangePasswordDialogOpen(true)}
            className="h-9 w-9 hover:bg-white transition-colors"
            title="Change password"
          >
            <Key className="h-4 w-4" />
          </Button>
        </div>

        {/* Profile Content - Modern Card */}
        <div className="rounded-lg border bg-card/50 shadow-sm overflow-hidden">
          {/* Section 1: Identity */}
          <div className="p-7 flex items-start gap-6 border-b border-border/50 bg-background/50">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
              <User className="h-8 w-8" />
            </div>
            <div className="space-y-2 flex-1">
              <h3 className="text-xl font-bold text-foreground">{profile.full_name}</h3>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4 flex-shrink-0" />
                <span>{profile.email}</span>
              </div>
              <div className="flex items-center gap-2 pt-1.5">
                <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border", profile.is_active ? "bg-green-500/10 text-green-600 border-green-500/30" : "bg-destructive/10 text-destructive border-destructive/30")}>
                  <span className={cn("h-2 w-2 rounded-full", profile.is_active ? "bg-green-500" : "bg-destructive")} />
                  {profile.is_active ? 'Active Account' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>

          {/* Section 2: Details Grid */}
          <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border/50">
            <div className="p-7 space-y-5">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Company Details</h4>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <span className="text-muted-foreground text-xs font-medium">Company</span>
                  <span className="col-span-2 font-semibold text-foreground">{profile.company_name}</span>
                </div>
              </div>
            </div>

            <div className="p-7 space-y-5">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Account Activity</h4>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <span className="text-muted-foreground text-xs font-medium">Created</span>
                  <span className="col-span-2 font-medium text-foreground">{formatDate(profile.created_at)}</span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <span className="text-muted-foreground text-xs font-medium">Last Login</span>
                  <span className="col-span-2 font-medium text-foreground">{profile.last_login_at ? formatDate(profile.last_login_at) : 'Never'}</span>
                </div>
                {profile.password_changed_at && (
                  <div className="grid grid-cols-3 gap-3">
                    <span className="text-muted-foreground text-xs font-medium">Pwd Changed</span>
                    <span className="col-span-2 font-medium text-foreground">{formatDate(profile.password_changed_at)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {profile.must_change_password && (
            <div className="p-4 bg-yellow-500/10 border-t border-yellow-500/20 text-yellow-600 flex items-center gap-3">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <span className="font-semibold text-sm">Security Alert: You are required to change your password immediately.</span>
            </div>
          )}
        </div>
      </div>

      <Dialog open={changePasswordDialogOpen} onOpenChange={setChangePasswordDialogOpen}>
        <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden">
          <DialogHeader className="p-6 pb-4 border-b bg-muted/20 border-border/50">
            <DialogTitle className="text-lg font-bold tracking-tight">Change Password</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-1">
              Ensure your account is secure with a strong password.
            </DialogDescription>
          </DialogHeader>

          <div className="p-6 space-y-4">
            {passwordError && (
              <div className="flex items-center gap-2 rounded-md border border-destructive/20 bg-destructive/10 px-3.5 py-3 text-xs font-medium text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                {passwordError}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="currentPassword" className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Current Password</Label>
              <div className="relative">
                <Input
                  id="currentPassword"
                  type={showCurrentPassword ? "text" : "password"}
                  className="h-9 text-sm pr-9"
                  placeholder="••••••••"
                  value={passwordData.currentPassword}
                  onChange={(e) =>
                    setPasswordData({ ...passwordData, currentPassword: e.target.value })
                  }
                  disabled={isChangingPassword}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                >
                  {showCurrentPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword" className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">New Password</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showNewPassword ? "text" : "password"}
                    className="h-9 text-sm pr-9"
                    placeholder="Min 8 chars"
                    value={passwordData.newPassword}
                    onChange={(e) =>
                      setPasswordData({ ...passwordData, newPassword: e.target.value })
                    }
                    disabled={isChangingPassword}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Confirm</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    className="h-9 text-sm pr-9"
                    placeholder="Re-enter"
                    value={passwordData.confirmPassword}
                    onChange={(e) =>
                      setPasswordData({ ...passwordData, confirmPassword: e.target.value })
                    }
                    disabled={isChangingPassword}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
            <div className="text-xs text-muted-foreground leading-relaxed pt-3 space-y-2 bg-muted/20 p-3 rounded-md">
              <p className="font-semibold text-foreground">Password Requirements:</p>
              <ul className="list-disc pl-4 space-y-1">
                <li>At least 8 characters long</li>
                <li>One uppercase & one lowercase letter</li>
                <li>One number & one special character (@$!%*?&)</li>
              </ul>
            </div>
          </div>

          <DialogFooter className="p-4 bg-muted/20 border-t border-border/50 gap-2 sm:gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setChangePasswordDialogOpen(false);
                setPasswordData({
                  currentPassword: '',
                  newPassword: '',
                  confirmPassword: '',
                });
                setPasswordError('');
              }}
              disabled={isChangingPassword}
              className="h-9 px-4 font-medium"
            >
              Cancel
            </Button>
            <Button
              onClick={handleChangePassword}
              disabled={isChangingPassword}
              size="sm"
              className="h-9 px-6 font-medium"
            >
              {isChangingPassword ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  Update Password
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}


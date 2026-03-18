import { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { syncTokensApi, SyncToken, SyncTokenStats } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Key,
  Loader2,
  RefreshCw,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  Activity,
  HardDrive,
  Upload,
  Download,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return 'N/A';
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return 'N/A';
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function isExpired(expiresAt: string | null | undefined): boolean {
  if (!expiresAt) return false;
  const date = new Date(expiresAt);
  if (Number.isNaN(date.getTime())) return false;
  return date < new Date();
}

export default function SyncTokens() {
  const [tokens, setTokens] = useState<SyncToken[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedToken, setSelectedToken] = useState<SyncToken | null>(null);
  const [tokenStats, setTokenStats] = useState<SyncTokenStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const { toast } = useToast();

  const fetchTokens = useCallback(async () => {
    try {
      const data = await syncTokensApi.list();
      setTokens(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch tokens:', error);
      toast({
        title: 'Error',
        description: 'Failed to load sync tokens.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchTokens();
  }, [fetchTokens]);

  const handleViewToken = async (token: SyncToken) => {
    setSelectedToken(token);
    setIsLoadingStats(true);
    setTokenStats(null);

    try {
      const [details, stats] = await Promise.all([
        syncTokensApi.get(token.id),
        syncTokensApi.getStats(token.id),
      ]);
      setSelectedToken(details);
      setTokenStats(stats);
    } catch (error) {
      console.error('Failed to fetch token details or stats:', error);
    } finally {
      setIsLoadingStats(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 h-full flex flex-col">
        {/* Header - Clean & Modern */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-foreground">Sync Tokens</h2>
            <p className="mt-1 text-sm text-muted-foreground">Manage API tokens for file synchronization</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={fetchTokens} className="h-9 w-9 hover:bg-muted/50 transition-colors" title="Refresh">
              <RefreshCw className="h-4 w-4" />
            </Button>
            {/* Provide 'Create Token' button if functionality existed, ensuring it matches style */}
          </div>
        </div>

        {/* Tokens List - Minimalist */}
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/30" />
          </div>
        ) : tokens.length === 0 ? (
          <div className="flex-1 rounded-lg border bg-card/50 shadow-sm flex flex-col items-center justify-center text-center p-12 space-y-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary/50">
              <Key className="h-8 w-8 text-muted-foreground/40" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">No sync tokens yet</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Contact your administrator to create API tokens for file synchronization.
              </p>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border bg-card/50 shadow-sm flex flex-col">
            <div className="px-4 py-3.5 border-b border-border/50 bg-muted/20 grid grid-cols-12 gap-4">
              <div className="col-span-4 text-xs font-semibold text-muted-foreground uppercase tracking-widest">Token Name</div>
              <div className="col-span-3 text-xs font-semibold text-muted-foreground uppercase tracking-widest">Permissions</div>
              <div className="col-span-3 text-xs font-semibold text-muted-foreground uppercase tracking-widest">Status</div>
              <div className="col-span-2 text-right text-xs font-semibold text-muted-foreground uppercase tracking-widest">Actions</div>
            </div>

            <div className="divide-y divide-border/50">
              {tokens.map((token) => {
                const expired = isExpired(token.expires_at);
                return (
                  <div
                    key={token.id}
                    className="group grid grid-cols-12 gap-4 items-center p-3.5 px-4 hover:bg-muted/40 transition-colors"
                  >
                    {/* Name & ID */}
                    <div className="col-span-4 min-w-0 pr-4">
                      <div className="flex items-center gap-3">
                        <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded bg-secondary/30 group-hover:bg-primary/10 transition-all", expired ? "text-destructive" : "text-primary")}>
                          <Key className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className={cn("text-sm font-semibold truncate group-hover:text-primary transition-colors", expired && "text-muted-foreground line-through decoration-destructive/50")}>{token.name}</p>
                          <p className="text-xs text-muted-foreground font-mono truncate opacity-70">{token.id}</p>
                        </div>
                      </div>
                    </div>

                    {/* Permissions - Compact Badges */}
                    <div className="col-span-3 flex items-center gap-2 flex-wrap">
                      {['read', 'write', 'delete'].map((perm) => {
                        const hasPerm = token[`can_${perm}` as keyof SyncToken];
                        if (!hasPerm) return null;
                        return (
                          <span key={perm} className="inline-flex items-center px-2 py-1 rounded-full bg-primary/10 text-xs font-semibold text-primary capitalize border border-primary/20 group-hover:border-primary/40 transition-colors">
                            {perm}
                          </span>
                        )
                      })}
                    </div>

                    {/* Status / Dates */}
                    <div className="col-span-3 min-w-0">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-xs">
                          <span className={cn("h-2 w-2 rounded-full shrink-0", expired ? "bg-destructive" : "bg-green-500")} />
                          <span className={cn("font-semibold", expired ? "text-destructive" : "text-foreground")}>
                            {expired ? 'Expired' : 'Active'}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          Exp: {formatDate(token.expires_at)}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="col-span-2 flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 hover:bg-muted/50"
                        onClick={() => handleViewToken(token)}
                        title="View details"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Token Details Dialog */}
      <Dialog
        open={!!selectedToken}
        onOpenChange={() => setSelectedToken(null)}
      >
        <DialogContent className="sm:max-w-lg p-0 overflow-hidden">
          <DialogHeader className="bg-muted/20 -m-6 mb-4 p-6 pb-4 border-b border-border/50">
            <div className="flex items-start justify-between gap-4">
              <div>
                <DialogTitle className="flex items-center gap-2.5 text-lg font-bold tracking-tight">
                  <Key className="h-5 w-5 text-primary" />
                  {selectedToken?.name}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Token details and usage statistics
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {selectedToken && (
            <div className="space-y-6 px-6 pb-6">
              {/* Token ID + Permissions */}
              <div className="rounded-lg border border-border/50 bg-card/50 p-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="mb-1.5 text-sm font-medium text-muted-foreground">
                      Token ID
                    </p>
                    <div className="rounded-md bg-muted/20 p-3 text-xs font-mono text-muted-foreground overflow-x-auto">
                      {selectedToken.id}
                    </div>
                  </div>

                  <div>
                    <p className="mb-2 text-sm font-medium text-muted-foreground">
                      Permissions
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {['read', 'write', 'delete'].map((perm) => {
                        const hasPermission =
                          selectedToken[`can_${perm}` as keyof SyncToken];
                        return (
                          <span
                            key={perm}
                            className={cn(
                              'inline-flex items-center gap-1 rounded-full border px-3 py-1 text-sm font-medium capitalize',
                              hasPermission ? 'status-active' : 'status-inactive'
                            )}
                          >
                            {hasPermission ? (
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            ) : (
                              <XCircle className="h-3.5 w-3.5" />
                            )}
                            {perm}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Usage statistics */}
              <div className="rounded-lg border border-border/50 bg-card/50 p-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-foreground">Usage Statistics</p>
                  {isLoadingStats && (
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  )}
                </div>

                {tokenStats ? (
                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="rounded-lg border border-border/50 bg-muted/30 p-4">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Activity className="h-4 w-4" />
                        <span className="text-xs font-medium">Total Requests</span>
                      </div>
                      <p className="mt-2 text-2xl font-bold text-foreground">
                        {Number(tokenStats.total_requests ?? 0).toLocaleString()}
                      </p>
                    </div>

                    <div className="rounded-lg border border-border/50 bg-muted/30 p-4">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <HardDrive className="h-4 w-4" />
                        <span className="text-xs font-medium">Data Transferred</span>
                      </div>
                      <p className="mt-2 text-2xl font-bold text-foreground">
                        {formatBytes(tokenStats.bytes_transferred)}
                      </p>
                    </div>

                    <div className="rounded-lg border border-border/50 bg-muted/30 p-4">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Upload className="h-4 w-4" />
                        <span className="text-xs font-medium">Files Uploaded</span>
                      </div>
                      <p className="mt-2 text-2xl font-bold text-foreground">
                        {Number(tokenStats.files_uploaded ?? 0).toLocaleString()}
                      </p>
                    </div>

                    <div className="rounded-lg border border-border/50 bg-muted/30 p-4">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Download className="h-4 w-4" />
                        <span className="text-xs font-medium">Files Downloaded</span>
                      </div>
                      <p className="mt-2 text-2xl font-bold text-foreground">
                        {Number(tokenStats.files_downloaded ?? 0).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-muted-foreground">
                    No statistics available
                  </p>
                )}
              </div>

              {/* Dates */}
              <div className="rounded-lg border border-border/50 bg-card/50 p-5">
                <p className="mb-3 text-sm font-semibold text-foreground">
                  Key Dates
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                      Created
                    </p>
                    <p className="mt-1.5 font-medium text-foreground">
                      {formatDate(selectedToken.created_at)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                      Expires
                    </p>
                    <p
                      className={cn(
                        'mt-1.5 font-medium',
                        isExpired(selectedToken.expires_at)
                          ? 'text-destructive'
                          : 'text-foreground'
                      )}
                    >
                      {formatDate(selectedToken.expires_at)}
                      {isExpired(selectedToken.expires_at) && (
                        <span className="block text-xs mt-1">(Expired)</span>
                      )}
                    </p>
                  </div>

                  {selectedToken.last_used_at && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                        Last Used
                      </p>
                      <p className="mt-1.5 font-medium text-foreground">
                        {formatDate(selectedToken.last_used_at)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

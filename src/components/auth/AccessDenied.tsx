import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { XCircle, LogOut } from 'lucide-react';

export function AccessDenied() {
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive">
            <XCircle className="h-8 w-8 text-destructive-foreground" />
          </div>
          <CardTitle className="text-2xl">Access Denied</CardTitle>
          <CardDescription>
            Your account access has been rejected
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md bg-destructive/10 p-4 text-sm">
            <p className="font-medium text-destructive">Account Rejected</p>
            <p className="mt-2 text-muted-foreground">
              Your request to access this inventory system has been denied by an administrator. 
              If you believe this is a mistake, please contact your system administrator.
            </p>
          </div>
          
          <div className="text-center text-sm text-muted-foreground">
            <p>Signed in as: {user?.email}</p>
          </div>
          
          <Button 
            onClick={signOut} 
            variant="outline"
            className="w-full"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Clock, LogOut } from 'lucide-react';

export function PendingApproval() {
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-yellow-500">
            <Clock className="h-8 w-8 text-white" />
          </div>
          <CardTitle className="text-2xl">Pending Approval</CardTitle>
          <CardDescription>
            Your account is waiting for administrator approval
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md bg-muted p-4 text-sm">
            <p className="font-medium">Hello, {user?.displayName}!</p>
            <p className="mt-2 text-muted-foreground">
              Your account has been created successfully. An administrator will review 
              your request and grant access soon.
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

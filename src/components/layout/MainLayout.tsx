import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';
import { Header } from './Header';

interface MainLayoutProps {
  children: React.ReactNode;
  title?: string;
  headerContent?: React.ReactNode;
}

export function MainLayout({ children, title, headerContent }: MainLayoutProps) {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      
      <div className="flex flex-1 flex-col">
        <Header title={title}>
          {headerContent}
        </Header>
        
        <main className="flex-1 overflow-y-auto p-4 pb-20 md:p-6 md:pb-6">
          {children}
        </main>
      </div>
      
      <BottomNav />
    </div>
  );
}

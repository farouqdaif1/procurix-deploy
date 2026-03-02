import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Cpu, ArrowLeft, Command } from 'lucide-react';
import { Button } from '@/app/shared/components/ui/button';
import { StageIndicator } from '@/app/shared/components/StageIndicator';
import { useState, useEffect } from 'react';
import { CommandPalette } from '@/app/shared/components/CommandPalette';
import type { SessionStage } from '@/app/types';
import { useSession } from '@/app/context/SessionContext';
import { getBOMBySessionId } from '@/app/services/api';

interface LayoutProps {
  children: React.ReactNode;
  showBackButton?: boolean;
  showStageIndicator?: boolean;
}

export function Layout({ children, showBackButton = true, showStageIndicator = false }: LayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const { sessionId, currentStage: maxReachedStage, setCurrentStage } = useSession();
  const [, setIsLoadingBOM] = useState(false);

  const getCurrentStage = (): SessionStage | null => {
    const path = location.pathname;
    const stageMap: Record<string, SessionStage> = {
      '/upload': 'upload',
      // '/discovery': 'discovery', // Commented out
     
      '/fundamental': 'fundamental',
      '/analysis': 'analysis',
       '/validate': 'validate', // Commented out
      '/architecture': 'architecture',
      '/requirements': 'requirements',
      '/subsystems': 'subsystems',
      '/compliance': 'compliance',
    };
    return stageMap[path] || null;
  };

  const currentStage = getCurrentStage();

  // Fetch BOM data to get current_stage when sessionId changes
  useEffect(() => {
    const fetchBOMData = async () => {
      if (sessionId && !maxReachedStage) {
        setIsLoadingBOM(true);
        try {
          const bom = await getBOMBySessionId(sessionId);
          if (bom) {
            setCurrentStage(bom.current_stage);
          }
        } catch (error) {
          console.error('Error fetching BOM data:', error);
        } finally {
          setIsLoadingBOM(false);
        }
      }
    };

    fetchBOMData();
  }, [sessionId, maxReachedStage, setCurrentStage]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setCommandPaletteOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleCommand = (command: string) => {
    const commandRoutes: Record<string, string> = {
      home: '/',
      upload: '/upload',
      // discovery: '/discovery', // Commented out
  
      fundamental: '/fundamental',
      analysis: '/analysis',
       validate: '/validate', // Commented out
      architecture: '/architecture',
      requirements: '/requirements',
      subsystems: '/subsystems',
      compliance: '/compliance',
      review: '/review',
      completed: '/completed',
    };
    
    const route = commandRoutes[command];
    if (route) {
      navigate(route);
    }
    setCommandPaletteOpen(false);
  };

  // Don't show header on library or completed pages
  if (location.pathname === '/' || location.pathname === '/completed') {
    return <>{children}</>;
  }

  return (
    <div className="flex flex-col h-screen">
      <header className="border-b bg-white px-6 py-4 shadow-sm shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {showBackButton && (
              <Link to="/">
                <Button variant="ghost" size="icon" className="mr-2">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
            )}
            <Cpu className="h-8 w-8 text-blue-500" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">BOM Evolution Platform</h1>
              <p className="text-sm text-gray-600">Workflow Stages</p>
            </div>
          </div>
          
          <button
            onClick={() => setCommandPaletteOpen(true)}
            className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            <Command className="h-4 w-4" />
            <span>Commands</span>
            <kbd className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">⌘K</kbd>
          </button>
        </div>

        {showStageIndicator && currentStage && (
          <StageIndicator
            currentStage={currentStage}
            maxReachedStage={maxReachedStage}
            onStageClick={(stage) => {
              const stageRoutes: Record<string, string> = {
                upload: '/upload',
                // discovery: '/discovery', // Commented out
               
                fundamental: '/fundamental',
                analysis: '/analysis',
                 validate: '/validate', // Commented out
                architecture: '/architecture',
                requirements: '/requirements',
                subsystems: '/subsystems',
                compliance: '/compliance',
              };
              const route = stageRoutes[stage];
              if (route) {
                navigate(route);
              }
            }}
          />
        )}
      </header>

      <main className="flex-1 overflow-auto">
        {children}
      </main>

      <CommandPalette
        open={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onCommand={handleCommand}
      />
    </div>
  );
}

import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Cpu, ArrowLeft, Command, MessageSquare } from 'lucide-react';
import { ChatDrawer } from '@/app/shared/components/ChatDrawer';
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

// Pages that have their own embedded chat — drawer and button hidden there
const PAGES_WITH_OWN_CHAT = new Set(['/system-identification', '/chat']);

export function Layout({ children, showBackButton = true, showStageIndicator = false }: LayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { sessionId, currentStage: maxReachedStage, setCurrentStage } = useSession();
  const [, setIsLoadingBOM] = useState(false);

  const hasOwnChat = PAGES_WITH_OWN_CHAT.has(location.pathname);

  const getCurrentStage = (): SessionStage | null => {
    const path = location.pathname;
    const stageMap: Record<string, SessionStage> = {
      '/upload': 'upload',
      '/part-identification': 'part-identification',
      '/system-identification': 'system-identification',
      '/classification': 'classification',
      '/validate': 'validate',
      '/architecture': 'architecture',
      '/requirements': 'requirements',
      '/subsystems': 'subsystems',
    };
    return stageMap[path] || null;
  };

  const currentStage = getCurrentStage();

  // Fetch BOM data to get current_stage when sessionId changes
  useEffect(() => {
    const fetchBOMData = async () => {
      if (location.pathname === '/upload' && !sessionId) {
        setCurrentStage(null);
        return;
      }
      if (sessionId && !maxReachedStage) {
        setIsLoadingBOM(true);
        try {
          const bom = await getBOMBySessionId(sessionId);
          if (bom) setCurrentStage(bom.current_stage);
        } catch (error) {
          console.error('Error fetching BOM data:', error);
        } finally {
          setIsLoadingBOM(false);
        }
      }
    };
    fetchBOMData();
  }, [sessionId, maxReachedStage, setCurrentStage, location.pathname]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCommandPaletteOpen(prev => !prev);
      }
      if (e.key === 'Escape') {
        setCommandPaletteOpen(false);
        setDrawerOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close drawer when navigating to a page with its own chat
  useEffect(() => {
    if (hasOwnChat) setDrawerOpen(false);
  }, [location.pathname, hasOwnChat]);

  const handleCommand = (command: string) => {
    const commandRoutes: Record<string, string> = {
      home: '/',
      upload: '/upload',
      'part-identification': '/part-identification',
      'system-identification': '/system-identification',
      classification: '/classification',
      validate: '/validate',
      architecture: '/architecture',
      requirements: '/requirements',
      subsystems: '/subsystems',
      review: '/review',
      completed: '/completed',
      chat: '/chat',
    };
    const route = commandRoutes[command];
    if (route) navigate(route);
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

          <div className="flex items-center gap-2">
            {/* Chat button — hidden on pages with their own console */}
            {sessionId && !hasOwnChat && (
              <button
                onClick={() => setDrawerOpen(prev => !prev)}
                className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm transition-colors ${
                  drawerOpen
                    ? 'border-blue-300 bg-blue-50 text-blue-700'
                    : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                <MessageSquare className="h-4 w-4" />
                <span>Chat</span>
              </button>
            )}

            <button
              onClick={() => setCommandPaletteOpen(true)}
              className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              <Command className="h-4 w-4" />
              <span>Commands</span>
              <kbd className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">⌘K</kbd>
            </button>
          </div>
        </div>

        {showStageIndicator && (currentStage ?? maxReachedStage) && (
          <StageIndicator
            currentStage={currentStage as any}
            maxReachedStage={maxReachedStage}
            onStageClick={(stage) => {
              const stageRoutes: Record<string, string> = {
                upload: '/upload',
                'part-identification': '/part-identification',
                'system-identification': '/system-identification',
                classification: '/classification',
                validate: '/validate',
                architecture: '/architecture',
                requirements: '/requirements',
                subsystems: '/subsystems',
              };
              const route = stageRoutes[stage];
              if (route) navigate(route);
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

      {/* Slide-over chat drawer — hidden on pages with their own embedded chat */}
      {!hasOwnChat && (
        <ChatDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      )}
    </div>
  );
}

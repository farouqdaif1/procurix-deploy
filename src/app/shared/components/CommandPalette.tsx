import { useState, useEffect } from 'react';
import { Command } from 'cmdk';
import { 
  Search, 
  Upload, 
  Zap, 
  CheckCircle, 
  FileText, 
  Sparkles,
  Filter,
  Layers,
  Box,
  ClipboardCheck,
  Home,
  CheckCircle2
} from 'lucide-react';

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  onCommand: (command: string) => void;
}

export function CommandPalette({ open, onClose, onCommand }: CommandPaletteProps) {
  const [search, setSearch] = useState('');

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [onClose]);

  if (!open) return null;

  const commands = [
    { id: 'home', label: 'Library', icon: Home, group: 'Navigation' },
    { id: 'upload', label: 'Upload BOM', icon: Upload, group: 'Workflow' },
    // { id: 'discovery', label: 'System Discovery', icon: Sparkles, group: 'Workflow' }, // Commented out
    { id: 'fundamental', label: 'Fundamental Classification', icon: Filter, group: 'Workflow' },
    { id: 'analysis', label: 'System Analysis', icon: Sparkles, group: 'Workflow' },    // { id: 'identify', label: 'Identify Components', icon: Zap, group: 'Workflow' }, // Commented out
    { id: 'identify', label: 'Identify Components', icon: Zap, group: 'Workflow' }, // Commented out

    { id: 'architecture', label: 'System Architecture', icon: Layers, group: 'Workflow' },
    { id: 'requirements', label: 'Requirements Analysis', icon: FileText, group: 'Workflow' },
    { id: 'subsystems', label: 'Subsystems', icon: Box, group: 'Workflow' },
    { id: 'compliance', label: 'Compliance Analysis', icon: CheckCircle, group: 'Workflow' },
    { id: 'review', label: 'Review', icon: ClipboardCheck, group: 'Workflow' },
    { id: 'completed', label: 'Completed BOMs', icon: CheckCircle2, group: 'Navigation' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="fixed left-1/2 top-[20%] -translate-x-1/2 w-full max-w-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <Command className="rounded-lg border border-gray-200 bg-white shadow-2xl">
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <Command.Input
              value={search}
              onValueChange={setSearch}
              placeholder="Type a command or search..."
              className="flex h-12 w-full bg-transparent py-3 text-sm outline-none placeholder:text-gray-400"
            />
          </div>
          <Command.List className="max-h-[400px] overflow-y-auto p-2">
            <Command.Empty className="py-6 text-center text-sm text-gray-500">
              No results found.
            </Command.Empty>
            
            {['Workflow', 'Navigation'].map((group) => (
              <Command.Group key={group} heading={group} className="mb-2">
                <div className="px-2 py-1.5 text-xs font-medium text-gray-500">
                  {group}
                </div>
                {commands
                  .filter((cmd) => cmd.group === group)
                  .map((cmd) => {
                    const Icon = cmd.icon;
                    return (
                      <Command.Item
                        key={cmd.id}
                        onSelect={() => {
                          onCommand(cmd.id);
                          onClose();
                        }}
                        className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-gray-100 aria-selected:bg-gray-100"
                      >
                        <Icon className="h-4 w-4 text-gray-500" />
                        <span>{cmd.label}</span>
                      </Command.Item>
                    );
                  })}
              </Command.Group>
            ))}
          </Command.List>
          <div className="border-t px-3 py-2 text-xs text-gray-500">
            Press <kbd className="rounded bg-gray-100 px-1.5 py-0.5">Esc</kbd> to close
          </div>
        </Command>
      </div>
    </div>
  );
}

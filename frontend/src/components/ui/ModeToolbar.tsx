import { useStore } from '../../store/useStore';
import type { AppMode } from '../../types';

const MODES: { mode: AppMode; label: string; icon: string }[] = [
  { mode: 'select', label: 'Select', icon: '🖱' },
  { mode: 'move', label: 'Move', icon: '✥' },
  { mode: 'cable', label: 'Cable', icon: '🔌' },
  { mode: 'delete', label: 'Delete', icon: '🗑' },
];

const FACES = [
  { key: 'front' as const, label: 'Front' },
  { key: 'back' as const, label: 'Back' },
  { key: 'free' as const, label: 'Free' },
];

export default function ModeToolbar() {
  const { mode, setMode, showFace, setShowFace } = useStore();
  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 bg-rack-surface/85 backdrop-blur border border-rack-border rounded-full px-3 py-1.5">
      {MODES.map((m) => (
        <button
          key={m.mode}
          onClick={() => setMode(m.mode)}
          className={`text-xs px-3 py-1 rounded-full transition-colors flex items-center gap-1 ${
            mode === m.mode ? 'bg-blue-900/60 border border-blue-600 text-blue-300' : 'text-rack-muted hover:text-rack-text'
          }`}
        >
          {m.icon} {m.label}
        </button>
      ))}
      <div className="w-px h-4 bg-rack-border mx-1" />
      {FACES.map((f) => (
        <button
          key={f.key}
          onClick={() => setShowFace(f.key)}
          className={`text-xs px-2 py-1 rounded-full transition-colors ${
            showFace === f.key ? 'text-purple-300 border border-purple-600 bg-purple-900/40' : 'text-rack-muted hover:text-rack-text'
          }`}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}

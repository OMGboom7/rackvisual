import { useStore } from '../../store/useStore';
import type { AppMode } from '../../types';

const MODES: { mode: AppMode; label: string; icon: string }[] = [
  { mode: 'select', label: '选择', icon: 'S' },
  { mode: 'move', label: '移动', icon: 'M' },
  { mode: 'cable', label: '线缆', icon: 'C' },
  { mode: 'delete', label: '删除', icon: 'D' },
];

const FACES = [
  { key: 'front' as const, label: '前' },
  { key: 'back' as const, label: '后' },
  { key: 'free' as const, label: '自由' },
];

export default function ModeToolbar() {
  const { mode, setMode, showFace, setShowFace } = useStore();
  return (
    <div className="absolute left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 bg-rack-surface/85 backdrop-blur border border-rack-border rounded-full
      md:bottom-4 md:px-3 md:py-1.5 md:gap-1
      bottom-20 px-2 py-2 gap-0.5">
      {MODES.map((m) => (
        <button
          key={m.mode}
          onClick={() => setMode(m.mode)}
          className={`transition-colors rounded-full flex items-center justify-center gap-1
            md:text-xs md:px-3 md:py-1
            text-sm px-4 py-1.5 min-w-[40px]
            ${mode === m.mode ? 'bg-blue-900/60 border border-blue-600 text-blue-300' : 'text-rack-muted hover:text-rack-text'}`}
        >
          <span className="md:hidden">{m.icon}</span>
          <span className="hidden md:inline">{m.icon}</span>
        </button>
      ))}
      <div className="w-px h-5 bg-rack-border mx-1" />
      {FACES.map((f) => (
        <button
          key={f.key}
          onClick={() => setShowFace(f.key)}
          className={`transition-colors rounded-full
            md:text-xs md:px-2 md:py-1
            text-sm px-3 py-1.5 min-w-[36px]
            ${showFace === f.key ? 'text-purple-300 border border-purple-600 bg-purple-900/40' : 'text-rack-muted hover:text-rack-text'}`}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}

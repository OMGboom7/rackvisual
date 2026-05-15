import { useState, useEffect } from 'react';
import { useRacks, useCreateRack } from '../../api/client';
import { useStore } from '../../store/useStore';

export default function RackSwitcher() {
  const { data: racks } = useRacks();
  const createRack = useCreateRack();
  const { selectedRackId, setSelectedRackId } = useStore();
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [newWidth, setNewWidth] = useState<'10"' | '19"'>('19"');
  const [newU, setNewU] = useState(12);

  useEffect(() => {
    if (racks?.length && !selectedRackId) setSelectedRackId(racks[0].id);
  }, [racks, selectedRackId, setSelectedRackId]);

  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 bg-rack-surface/85 backdrop-blur border border-rack-border rounded-full px-4 py-1.5">
      <span className="text-blue-400 font-bold text-sm mr-1">⬡ RackVisual</span>
      <div className="w-px h-4 bg-rack-border" />
      {(racks ?? []).map((r) => (
        <button
          key={r.id}
          onClick={() => setSelectedRackId(r.id)}
          className={`text-xs px-3 py-0.5 rounded-full transition-colors ${
            selectedRackId === r.id
              ? 'bg-blue-900/60 border border-blue-600 text-blue-300'
              : 'text-rack-muted hover:text-rack-text'
          }`}
        >
          🗄 {r.name}
        </button>
      ))}
      {showNew ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!newName) return;
            createRack.mutate({ name: newName, width: newWidth, height_u: newU, color: '#1c2230' }, {
              onSuccess: (r) => { setSelectedRackId(r.id); setShowNew(false); setNewName(''); },
            });
          }}
          className="flex items-center gap-1"
        >
          <input
            autoFocus value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Name"
            className="bg-rack-bg border border-rack-border rounded px-2 py-0.5 text-xs text-rack-text w-28"
          />
          <select
            value={newWidth} onChange={(e) => setNewWidth(e.target.value as '10"' | '19"')}
            className="bg-rack-bg border border-rack-border rounded px-1 py-0.5 text-xs text-rack-text"
          >
            <option value='19"'>19"</option>
            <option value='10"'>10"</option>
          </select>
          <input
            type="number" min={1} max={48} value={newU} onChange={(e) => setNewU(Number(e.target.value))}
            className="bg-rack-bg border border-rack-border rounded px-2 py-0.5 text-xs text-rack-text w-14"
          />
          <span className="text-xs text-rack-muted">U</span>
          <button type="submit" className="text-xs text-green-400 px-2">✓</button>
          <button type="button" onClick={() => setShowNew(false)} className="text-xs text-rack-muted px-1">✕</button>
        </form>
      ) : (
        <button onClick={() => setShowNew(true)} className="text-xs text-green-400 hover:text-green-300 px-2">+ Neu</button>
      )}
    </div>
  );
}

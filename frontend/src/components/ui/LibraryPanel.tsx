import { useState } from 'react';
import { useModels, useCreateComponent, useComponents } from '../../api/client';
import { useStore } from '../../store/useStore';

export default function LibraryPanel() {
  const { data: models } = useModels();
  const { selectedRackId } = useStore();
  const { data: components } = useComponents(selectedRackId);
  const createComponent = useCreateComponent();
  const [expanded, setExpanded] = useState(false);

  const typeEmoji: Record<string, string> = {
    server: '🖥', switch: '🔀', patch_panel: '🔌', ups: '🔋',
    pdu: '⚡', blank: '▬', kvm: '📺', custom: '📦',
  };

  const groups = models?.reduce((acc, m) => {
    if (!acc[m.type]) acc[m.type] = [];
    acc[m.type].push(m);
    return acc;
  }, {} as Record<string, typeof models>) ?? {};

  const handleAdd = (modelId: number) => {
    if (!selectedRackId || !components) return;
    const occupied = new Set(
      components.flatMap((c) => Array.from({ length: c.height_u }, (_, i) => c.slot_position + i))
    );
    let slot = 1;
    while (occupied.has(slot)) slot++;
    const modelName = models?.find((m) => m.id === modelId)?.name ?? 'Device';
    createComponent.mutate({ rackId: selectedRackId, data: { model_id: modelId, slot_position: slot, name: modelName } });
  };

  return (
    <div className={`absolute left-3 top-1/2 -translate-y-1/2 z-10 flex flex-col bg-rack-surface/85 backdrop-blur border border-rack-border rounded-lg transition-all ${expanded ? 'w-52' : 'w-12'}`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="p-2 text-rack-muted hover:text-rack-text text-center text-xs border-b border-rack-border"
      >
        {expanded ? '◀ LIB' : '▶'}
      </button>
      {expanded ? (
        <div className="p-2 flex flex-col gap-2 max-h-96 overflow-y-auto">
          {Object.entries(groups).map(([type, items]) => (
            <div key={type}>
              <div className="text-xs text-rack-muted uppercase tracking-wide mb-1">{type}</div>
              {items?.map((m) => (
                <button
                  key={m.id}
                  onClick={() => handleAdd(m.id)}
                  disabled={!selectedRackId}
                  className="w-full text-left text-xs px-2 py-1 rounded bg-rack-bg hover:bg-blue-900/30 text-rack-text border border-rack-border mb-0.5 disabled:opacity-40 flex items-center gap-1"
                >
                  <span>{typeEmoji[m.type] ?? '📦'}</span>
                  <span>{m.name}</span>
                  <span className="ml-auto text-rack-muted">{m.height_u}U</span>
                </button>
              ))}
            </div>
          ))}
        </div>
      ) : (
        <div className="p-1 flex flex-col gap-1">
          {Object.keys(groups).map((type) => (
            <div key={type} className="text-center text-lg py-0.5" title={type}>
              {typeEmoji[type] ?? '📦'}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

import { useRef, useState } from 'react';
import { useModels, useCreateComponent, useComponents, useUploadModel, useDeleteModel, useRacks } from '../../api/client';
import { useStore } from '../../store/useStore';

interface PendingModel { id: number; name: string; heightU: number; hasGltf: boolean; }

export default function LibraryPanel() {
  const { data: models } = useModels();
  const { selectedRackId } = useStore();
  const { data: components } = useComponents(selectedRackId);
  const { data: racks } = useRacks();
  const createComponent = useCreateComponent();
  const uploadModel = useUploadModel();
  const deleteModel = useDeleteModel();
  const [expanded, setExpanded] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, setPending] = useState<PendingModel | null>(null);
  const [slotInput, setSlotInput] = useState('');
  const [face, setFace] = useState<'front' | 'back'>('front');
  const [slotError, setSlotError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const rack = racks?.find((r) => r.id === selectedRackId);

  const groups = models?.reduce((acc, m) => {
    if (!acc[m.type]) acc[m.type] = [];
    acc[m.type].push(m);
    return acc;
  }, {} as Record<string, typeof models>) ?? {};

  const handleAdd = (modelId: number) => {
    if (!selectedRackId) return;
    const model = models?.find((m) => m.id === modelId);
    if (!model) return;
    setPending({ id: modelId, name: model.name, heightU: model.height_u, hasGltf: !!model.file_path });
    setSlotInput('');
    setSlotError('');
  };

  const confirmAdd = () => {
    if (!pending || !selectedRackId || !rack) return;
    const slot = parseInt(slotInput, 10);
    if (isNaN(slot) || slot < 1 || slot + pending.heightU - 1 > rack.height_u) {
      setSlotError(`Slot 1–${rack.height_u - pending.heightU + 1} eingeben`);
      return;
    }
    const occupied = new Set(
      (components ?? []).flatMap((c) => Array.from({ length: c.height_u }, (_, i) => c.slot_position + i))
    );
    for (let i = 0; i < pending.heightU; i++) {
      if (occupied.has(slot + i)) { setSlotError('Slot belegt'); return; }
    }
    const specs = pending.hasGltf ? JSON.stringify({ face }) : null;
    createComponent.mutate(
      { rackId: selectedRackId, data: { model_id: pending.id, slot_position: slot, name: pending.name, specs } },
      { onSuccess: () => setPending(null) },
    );
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('model', file);
    formData.append('name', file.name.replace(/\.(gltf|glb)$/i, ''));
    uploadModel.mutate(formData, {
      onSuccess: (m) => {
        setUploadMsg({ ok: true, text: `"${m.name}" hochgeladen` });
        setTimeout(() => setUploadMsg(null), 4000);
        if (fileRef.current) fileRef.current.value = '';
      },
      onError: (err) => {
        setUploadMsg({ ok: false, text: err.message });
        setTimeout(() => setUploadMsg(null), 5000);
      },
    });
  };

  return (
    <div className={`absolute left-3 top-1/2 -translate-y-1/2 z-10 flex flex-col bg-rack-surface/85 backdrop-blur border border-rack-border rounded-lg transition-all ${expanded ? 'w-52' : 'w-12'}`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="p-2 text-rack-muted hover:text-rack-text text-center text-xs border-b border-rack-border"
      >
        {expanded ? '◀ LIB' : '▶'}
      </button>
      {expanded && pending && (
        <div className="p-2 border-b border-rack-border bg-blue-950/40">
          <div className="text-blue-300 text-xs mb-1.5 truncate">+ {pending.name} ({pending.heightU}U)</div>
          {pending.hasGltf && (
            <div className="flex gap-1 mb-1.5">
              {(['front', 'back'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFace(f)}
                  className={`flex-1 py-0.5 rounded text-xs transition-colors ${
                    face === f ? 'bg-blue-800 text-blue-200 border border-blue-500' : 'text-rack-muted hover:text-rack-text border border-rack-border'
                  }`}
                >
                  {f === 'front' ? 'Vorderwand' : 'Rückwand'}
                </button>
              ))}
            </div>
          )}
          <div className="flex gap-1 items-center">
            <input
              autoFocus
              type="number" min={1} max={rack?.height_u ?? 42}
              value={slotInput}
              onChange={(e) => { setSlotInput(e.target.value); setSlotError(''); }}
              onKeyDown={(e) => { if (e.key === 'Enter') confirmAdd(); if (e.key === 'Escape') setPending(null); }}
              placeholder="Slot"
              className="w-16 bg-rack-bg border border-blue-600 rounded px-1.5 py-0.5 text-rack-text text-xs"
            />
            <button onClick={confirmAdd} className="bg-blue-800 hover:bg-blue-700 rounded px-2 py-0.5 text-blue-200 text-xs">OK</button>
            <button onClick={() => setPending(null)} className="text-rack-muted hover:text-rack-text text-xs px-1">×</button>
          </div>
          {slotError && <div className="text-red-400 text-xs mt-1">{slotError}</div>}
        </div>
      )}
      {expanded ? (
        <div className="p-2 flex flex-col gap-2 max-h-[32rem] overflow-y-auto">
          {Object.entries(groups).map(([type, items]) => (
            <div key={type}>
              <div className="text-xs text-rack-muted uppercase tracking-wide mb-1">{type}</div>
              {items?.map((m) => (
                <div key={m.id} className="flex items-center gap-0.5 mb-0.5">
                  <button
                    onClick={() => handleAdd(m.id)}
                    disabled={!selectedRackId}
                    className="flex-1 text-left text-xs px-2 py-1 rounded bg-rack-bg hover:bg-blue-900/30 text-rack-text border border-rack-border disabled:opacity-40 flex items-center gap-1"
                  >
                    <span className="truncate">{m.name}</span>
                    <span className="ml-auto text-rack-muted shrink-0">{m.height_u}U</span>
                  </button>
                  {!m.is_builtin && (
                    <button
                      onClick={() => deleteModel.mutate(m.id)}
                      className="text-red-400 hover:text-red-300 px-1 text-xs"
                      title="Modell löschen"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
          ))}

          {/* GLTF Upload */}
          <div className="border-t border-rack-border pt-2 mt-1">
            <div className="text-xs text-rack-muted uppercase tracking-wide mb-1.5">GLTF / GLB Upload</div>
            <label className="w-full flex items-center justify-center gap-1 text-xs px-2 py-1.5 rounded bg-rack-bg border border-dashed border-rack-border text-rack-muted hover:text-rack-text hover:border-blue-500 cursor-pointer transition-colors">
              Datei wählen…
              <input
                ref={fileRef}
                type="file"
                accept=".gltf,.glb"
                onChange={handleUpload}
                className="hidden"
                disabled={uploadModel.isPending}
              />
            </label>
            {uploadModel.isPending && (
              <div className="text-xs text-blue-400 mt-1 text-center">Lädt hoch…</div>
            )}
            {uploadMsg && (
              <div className={`text-xs mt-1 px-1.5 py-1 rounded ${uploadMsg.ok ? 'bg-green-900/40 text-green-300' : 'bg-red-900/40 text-red-300'}`}>
                {uploadMsg.ok ? 'OK: ' : 'Fehler: '}{uploadMsg.text}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="p-1 flex flex-col gap-1">
          {Object.keys(groups).map((type) => (
            <div key={type} className="text-center text-xs py-0.5 text-rack-muted" title={type}>
              {type.slice(0, 2).toUpperCase()}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

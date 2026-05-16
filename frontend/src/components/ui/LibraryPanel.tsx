import { useRef, useState } from 'react';
import { useModels, useCreateComponent, useComponents, useUploadModel, useDeleteModel } from '../../api/client';
import { useStore } from '../../store/useStore';

export default function LibraryPanel() {
  const { data: models } = useModels();
  const { selectedRackId } = useStore();
  const { data: components } = useComponents(selectedRackId);
  const createComponent = useCreateComponent();
  const uploadModel = useUploadModel();
  const deleteModel = useDeleteModel();
  const [expanded, setExpanded] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const typeEmoji: Record<string, string> = {
    server: '🖥', switch: '🔀', patch_panel: '🔌', ups: '🔋',
    pdu: '⚡', blank: '▬', kvm: '📺', storage: '💾',
    firewall: '🔥', router: '🌐', custom: '📦',
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
                    <span>{typeEmoji[m.type] ?? '📦'}</span>
                    <span className="truncate">{m.name}</span>
                    <span className="ml-auto text-rack-muted shrink-0">{m.height_u}U</span>
                  </button>
                  {!m.is_builtin && (
                    <button
                      onClick={() => deleteModel.mutate(m.id)}
                      className="text-red-400 hover:text-red-300 px-1 text-xs"
                      title="Modell löschen"
                    >
                      ✕
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
              📁 Datei wählen…
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
                {uploadMsg.ok ? '✓ ' : '✗ '}{uploadMsg.text}
              </div>
            )}
          </div>
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

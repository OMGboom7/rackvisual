import { useState } from 'react';
import { useStore } from '../../store/useStore';
import {
  useComponents, useUpdateComponent, useDeleteComponent,
  useVlans, useCircuits, useModelPorts, useCables,
} from '../../api/client';
import type { RackComponent, Hardware, StorageEntry } from '../../types';

type Tab = 'info' | 'hardware' | 'ports';

const emptyHardware = (): Hardware => ({ cpu: '', ram: '', gpu: '', storage: [] });

export default function DetailPanel() {
  const { selectedRackId, selectedComponentId, setSelectedComponentId, mode } = useStore();
  const { data: components } = useComponents(selectedRackId);
  const { data: vlans } = useVlans(selectedRackId);
  const { data: circuits } = useCircuits(selectedRackId);
  const { data: cables } = useCables(selectedRackId);
  const updateComponent = useUpdateComponent();
  const deleteComponent = useDeleteComponent();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Partial<RackComponent>>({});
  const [hwForm, setHwForm] = useState<Hardware>(emptyHardware());
  const [tab, setTab] = useState<Tab>('info');
  const [moveSlot, setMoveSlot] = useState('');
  const [moveError, setMoveError] = useState('');

  const comp = components?.find((c) => c.id === selectedComponentId);
  const { data: ports } = useModelPorts(comp?.model_id ?? null);

  if (!comp || !selectedRackId) return null;

  const startEdit = () => {
    setForm({ ...comp });
    setHwForm(comp.hardware ? { ...comp.hardware, storage: [...(comp.hardware.storage ?? [])] } : emptyHardware());
    setEditing(true);
  };

  const save = () => {
    updateComponent.mutate({
      rackId: selectedRackId,
      compId: comp.id,
      data: { ...form, hardware: hwForm },
    });
    setEditing(false);
  };

  const remove = () => {
    deleteComponent.mutate({ rackId: selectedRackId, compId: comp.id });
    setSelectedComponentId(null);
  };

  const handleMove = () => {
    const slot = parseInt(moveSlot, 10);
    if (isNaN(slot) || slot < 1) { setMoveError('Ungültige Slot-Nummer'); return; }
    setMoveError('');
    updateComponent.mutate(
      { rackId: selectedRackId, compId: comp.id, data: { slot_position: slot } },
      { onError: () => setMoveError('Slot belegt oder ungültig') },
    );
    setMoveSlot('');
  };

  const occupiedPortIds = new Set(
    cables?.flatMap((c) => [c.from_port_id, c.to_port_id]) ?? []
  );

  const addStorage = () =>
    setHwForm((h) => ({ ...h, storage: [...h.storage, { label: '', size: '' }] }));

  const updateStorage = (i: number, field: keyof StorageEntry, val: string) =>
    setHwForm((h) => {
      const s = [...h.storage];
      s[i] = { ...s[i], [field]: val };
      return { ...h, storage: s };
    });

  const removeStorage = (i: number) =>
    setHwForm((h) => ({ ...h, storage: h.storage.filter((_, idx) => idx !== i) }));

  const tabs: { key: Tab; label: string }[] = [
    { key: 'info', label: 'Info' },
    { key: 'hardware', label: 'Hardware' },
    { key: 'ports', label: `Ports (${ports?.length ?? 0})` },
  ];

  return (
    <div className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-60 bg-rack-surface/90 backdrop-blur border border-blue-600/60 rounded-lg p-3 text-xs">
      {/* Header */}
      <div className="flex items-center justify-between mb-2 border-b border-rack-border pb-1.5">
        <span className="text-blue-300 font-medium truncate">{comp.name}</span>
        <button onClick={() => setSelectedComponentId(null)} className="text-rack-muted hover:text-rack-text ml-2">✕</button>
      </div>

      {/* Move-Modus Banner */}
      {mode === 'move' && (
        <div className="mb-2 bg-yellow-900/40 border border-yellow-600/40 rounded p-2">
          <div className="text-yellow-300 mb-1">✥ Verschieben (aktuell: Slot {comp.slot_position})</div>
          <div className="flex gap-1">
            <input
              type="number" min={1} value={moveSlot}
              onChange={(e) => setMoveSlot(e.target.value)}
              placeholder="Neuer Slot"
              className="flex-1 bg-rack-bg border border-rack-border rounded px-1.5 py-0.5 text-rack-text"
            />
            <button onClick={handleMove} className="bg-yellow-700 hover:bg-yellow-600 rounded px-2 py-0.5 text-yellow-100">→</button>
          </div>
          {moveError && <div className="text-red-400 mt-1">{moveError}</div>}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-0.5 rounded text-xs transition-colors ${
              tab === t.key ? 'bg-blue-900/60 text-blue-300 border border-blue-600' : 'text-rack-muted hover:text-rack-text'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Info Tab ── */}
      {tab === 'info' && (
        editing ? (
          <div className="flex flex-col gap-1.5">
            {[
              { key: 'name', label: 'Name' },
              { key: 'os', label: 'OS' },
              { key: 'ip', label: 'IP' },
            ].map(({ key, label }) => (
              <div key={key} className="flex items-center gap-1">
                <span className="text-rack-muted w-10 shrink-0">{label}:</span>
                <input
                  value={(form as any)[key] ?? ''}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  className="flex-1 bg-rack-bg border border-rack-border rounded px-1.5 py-0.5 text-rack-text"
                />
              </div>
            ))}
            <div className="flex items-center gap-1">
              <span className="text-rack-muted w-10 shrink-0">VLAN:</span>
              <select
                value={form.vlan_id ?? ''}
                onChange={(e) => setForm({ ...form, vlan_id: e.target.value ? Number(e.target.value) : null })}
                className="flex-1 bg-rack-bg border border-rack-border rounded px-1 py-0.5 text-rack-text"
              >
                <option value="">—</option>
                {(vlans ?? []).map((v) => <option key={v.id} value={v.id}>{v.vlan_id} {v.name}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-rack-muted w-10 shrink-0">Strom:</span>
              <select
                value={form.circuit_id ?? ''}
                onChange={(e) => setForm({ ...form, circuit_id: e.target.value ? Number(e.target.value) : null })}
                className="flex-1 bg-rack-bg border border-rack-border rounded px-1 py-0.5 text-rack-text"
              >
                <option value="">—</option>
                {(circuits ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="flex gap-1 mt-1">
              <button onClick={save} className="flex-1 bg-green-800 hover:bg-green-700 rounded px-2 py-1 text-green-200">Speichern</button>
              <button onClick={() => setEditing(false)} className="flex-1 bg-rack-bg hover:bg-rack-border rounded px-2 py-1 text-rack-muted">Abbruch</button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {[
              { label: 'Slot', val: String(comp.slot_position) },
              { label: 'OS', val: comp.os },
              { label: 'IP', val: comp.ip },
              { label: 'VLAN', val: vlans?.find((v) => v.id === comp.vlan_id)?.name },
              { label: 'Strom', val: circuits?.find((c) => c.id === comp.circuit_id)?.name },
            ].filter((f) => f.val).map(({ label, val }) => (
              <div key={label} className="flex gap-1">
                <span className="text-rack-muted w-10 shrink-0">{label}:</span>
                <span className="text-rack-text">{val}</span>
              </div>
            ))}
            {comp.tags.length > 0 && (
              <div className="flex flex-wrap gap-0.5 mt-1">
                {comp.tags.map((t) => <span key={t} className="bg-rack-bg border border-rack-border rounded px-1.5 text-rack-muted">{t}</span>)}
              </div>
            )}
            {(comp.services.vms.length > 0 || comp.services.containers.length > 0) && (
              <div className="mt-1 border-t border-rack-border pt-1">
                {comp.services.vms.map((v) => <div key={v} className="text-purple-400">● VM: {v}</div>)}
                {comp.services.containers.map((c) => <div key={c} className="text-green-400">🐳 {c}</div>)}
              </div>
            )}
            <div className="flex gap-1 mt-2">
              <button onClick={startEdit} className="flex-1 bg-green-900/50 hover:bg-green-800/60 border border-green-700/40 rounded px-2 py-1 text-green-300">✏ Edit</button>
              <button onClick={remove} className="bg-red-900/50 hover:bg-red-800/60 border border-red-700/40 rounded px-2 py-1 text-red-300">🗑</button>
            </div>
          </div>
        )
      )}

      {/* ── Hardware Tab ── */}
      {tab === 'hardware' && (
        editing ? (
          <div className="flex flex-col gap-1.5">
            {([['cpu', 'CPU'], ['ram', 'RAM'], ['gpu', 'GPU']] as const).map(([key, label]) => (
              <div key={key} className="flex items-center gap-1">
                <span className="text-rack-muted w-8 shrink-0">{label}:</span>
                <input
                  value={hwForm[key] ?? ''}
                  onChange={(e) => setHwForm((h) => ({ ...h, [key]: e.target.value }))}
                  placeholder={key === 'cpu' ? 'z.B. Intel Xeon E5' : key === 'ram' ? 'z.B. 64 GB DDR4' : 'z.B. Quadro P400'}
                  className="flex-1 bg-rack-bg border border-rack-border rounded px-1.5 py-0.5 text-rack-text"
                />
              </div>
            ))}
            {/* Storage entries */}
            <div className="border-t border-rack-border pt-1.5 mt-0.5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-rack-muted">Speicher</span>
                <button onClick={addStorage} className="text-blue-400 hover:text-blue-300 text-xs">+ Add</button>
              </div>
              {hwForm.storage.map((s, i) => (
                <div key={i} className="flex gap-1 mb-1">
                  <input
                    value={s.size}
                    onChange={(e) => updateStorage(i, 'size', e.target.value)}
                    placeholder="2 TB"
                    className="w-14 bg-rack-bg border border-rack-border rounded px-1.5 py-0.5 text-rack-text"
                  />
                  <input
                    value={s.label}
                    onChange={(e) => updateStorage(i, 'label', e.target.value)}
                    placeholder="SSD / HDD / NVMe"
                    className="flex-1 bg-rack-bg border border-rack-border rounded px-1.5 py-0.5 text-rack-text"
                  />
                  <button onClick={() => removeStorage(i)} className="text-red-400 hover:text-red-300 px-1">✕</button>
                </div>
              ))}
              {hwForm.storage.length === 0 && (
                <div className="text-rack-muted text-center py-1">Kein Speicher eingetragen</div>
              )}
            </div>
            <div className="flex gap-1 mt-1">
              <button onClick={save} className="flex-1 bg-green-800 hover:bg-green-700 rounded px-2 py-1 text-green-200">Speichern</button>
              <button onClick={() => setEditing(false)} className="flex-1 bg-rack-bg hover:bg-rack-border rounded px-2 py-1 text-rack-muted">Abbruch</button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {[
              { label: 'CPU', val: comp.hardware?.cpu },
              { label: 'RAM', val: comp.hardware?.ram },
              { label: 'GPU', val: comp.hardware?.gpu },
            ].filter((f) => f.val).map(({ label, val }) => (
              <div key={label} className="flex gap-1">
                <span className="text-rack-muted w-8 shrink-0">{label}:</span>
                <span className="text-rack-text">{val}</span>
              </div>
            ))}
            {comp.hardware?.storage && comp.hardware.storage.length > 0 && (
              <div className="mt-1 border-t border-rack-border pt-1">
                <div className="text-rack-muted mb-0.5">Speicher:</div>
                {comp.hardware.storage.map((s, i) => (
                  <div key={i} className="flex gap-1.5 text-rack-text">
                    <span className="text-blue-400 shrink-0">{s.size}</span>
                    <span>{s.label}</span>
                  </div>
                ))}
              </div>
            )}
            {!comp.hardware?.cpu && !comp.hardware?.ram && !comp.hardware?.gpu && !comp.hardware?.storage?.length && (
              <div className="text-rack-muted text-center py-2">Keine Hardware-Daten</div>
            )}
            <button onClick={startEdit} className="mt-2 bg-green-900/50 hover:bg-green-800/60 border border-green-700/40 rounded px-2 py-1 text-green-300">✏ Bearbeiten</button>
          </div>
        )
      )}

      {/* ── Ports Tab ── */}
      {tab === 'ports' && (
        <div className="flex flex-col gap-1 max-h-64 overflow-y-auto">
          {!ports || ports.length === 0 ? (
            <div className="text-rack-muted text-center py-2">Keine Ports definiert</div>
          ) : (
            ports.map((port) => {
              const occupied = occupiedPortIds.has(port.id);
              const typeColor = port.port_type === 'net' ? 'text-blue-400' : 'text-red-400';
              const faceLabel = port.face === 'front' ? 'F' : 'B';
              return (
                <div key={port.id} className={`flex items-center gap-1.5 px-1.5 py-1 rounded ${occupied ? 'bg-rack-border/40' : 'bg-rack-bg'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${occupied ? 'bg-orange-400' : 'bg-green-500'}`} />
                  <span className={`${typeColor} w-4 shrink-0 text-center font-mono`}>{faceLabel}</span>
                  <span className="text-rack-text flex-1 truncate">{port.label}</span>
                  <span className="text-rack-muted">{occupied ? 'belegt' : 'frei'}</span>
                </div>
              );
            })
          )}
          <div className="text-rack-muted border-t border-rack-border pt-1 mt-1 text-center">
            {ports?.filter((p) => !occupiedPortIds.has(p.id)).length ?? 0} frei · {ports?.filter((p) => occupiedPortIds.has(p.id)).length ?? 0} belegt
          </div>
        </div>
      )}
    </div>
  );
}

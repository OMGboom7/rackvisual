import { useState } from 'react';
import { useStore } from '../../store/useStore';
import { useComponents, useUpdateComponent, useDeleteComponent, useVlans, useCircuits } from '../../api/client';
import type { RackComponent } from '../../types';

export default function DetailPanel() {
  const { selectedRackId, selectedComponentId, setSelectedComponentId } = useStore();
  const { data: components } = useComponents(selectedRackId);
  const { data: vlans } = useVlans(selectedRackId);
  const { data: circuits } = useCircuits(selectedRackId);
  const updateComponent = useUpdateComponent();
  const deleteComponent = useDeleteComponent();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Partial<RackComponent>>({});

  const comp = components?.find((c) => c.id === selectedComponentId);
  if (!comp || !selectedRackId) return null;

  const startEdit = () => { setForm({ ...comp }); setEditing(true); };
  const save = () => {
    updateComponent.mutate({ rackId: selectedRackId, compId: comp.id, data: form });
    setEditing(false);
  };
  const remove = () => {
    deleteComponent.mutate({ rackId: selectedRackId, compId: comp.id });
    setSelectedComponentId(null);
  };

  return (
    <div className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-52 bg-rack-surface/90 backdrop-blur border border-blue-600/60 rounded-lg p-3 text-xs">
      <div className="flex items-center justify-between mb-2 border-b border-rack-border pb-1.5">
        <span className="text-blue-300 font-medium truncate">{comp.name}</span>
        <button onClick={() => setSelectedComponentId(null)} className="text-rack-muted hover:text-rack-text ml-2">✕</button>
      </div>
      {editing ? (
        <div className="flex flex-col gap-1.5">
          {[
            { key: 'name', label: 'Name' }, { key: 'os', label: 'OS' },
            { key: 'specs', label: 'Specs' }, { key: 'ip', label: 'IP' },
          ].map(({ key, label }) => (
            <div key={key} className="flex items-center gap-1">
              <span className="text-rack-muted w-12 shrink-0">{label}:</span>
              <input
                value={(form as any)[key] ?? ''}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                className="flex-1 bg-rack-bg border border-rack-border rounded px-1.5 py-0.5 text-rack-text"
              />
            </div>
          ))}
          <div className="flex items-center gap-1">
            <span className="text-rack-muted w-12 shrink-0">VLAN:</span>
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
            <span className="text-rack-muted w-12 shrink-0">Strom:</span>
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
            { label: 'OS', val: comp.os },
            { label: 'Specs', val: comp.specs },
            { label: 'IP', val: comp.ip },
            { label: 'VLAN', val: vlans?.find((v) => v.id === comp.vlan_id)?.name },
            { label: 'Strom', val: circuits?.find((c) => c.id === comp.circuit_id)?.name },
          ].filter((f) => f.val).map(({ label, val }) => (
            <div key={label} className="flex gap-1">
              <span className="text-rack-muted w-12 shrink-0">{label}:</span>
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
      )}
    </div>
  );
}

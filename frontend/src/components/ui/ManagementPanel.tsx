import { useState } from 'react';
import { useStore } from '../../store/useStore';
import { useVlans, useCircuits } from '../../api/client';
import { useQueryClient, useMutation } from '@tanstack/react-query';

const BASE = '/api';
async function apiDelete(url: string) {
  const res = await fetch(BASE + url, { method: 'DELETE' });
  if (res.status !== 204 && !res.ok) throw new Error(await res.text());
}
async function apiPost<T>(url: string, body: object): Promise<T> {
  const res = await fetch(BASE + url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

interface Vlan { id: number; rack_id: number; vlan_id: number; name: string; color: string; }
interface Circuit { id: number; rack_id: number; name: string; color: string; ampere: number | null; }

export default function ManagementPanel() {
  const { selectedRackId } = useStore();
  const { data: vlans } = useVlans(selectedRackId);
  const { data: circuits } = useCircuits(selectedRackId);
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'vlans' | 'circuits'>('vlans');

  // VLAN form
  const [vlanId, setVlanId] = useState('');
  const [vlanName, setVlanName] = useState('');
  const [vlanColor, setVlanColor] = useState('#63b3ed');

  // Circuit form
  const [circName, setCircName] = useState('');
  const [circColor, setCircColor] = useState('#fc8181');
  const [circAmpere, setCircAmpere] = useState('');

  const addVlan = useMutation({
    mutationFn: () => apiPost<Vlan>(`/racks/${selectedRackId}/vlans`, {
      vlan_id: Number(vlanId), name: vlanName, color: vlanColor,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vlans', selectedRackId] });
      setVlanId(''); setVlanName('');
    },
  });

  const deleteVlan = useMutation({
    mutationFn: (id: number) => apiDelete(`/racks/${selectedRackId}/vlans/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vlans', selectedRackId] }),
  });

  const addCircuit = useMutation({
    mutationFn: () => apiPost<Circuit>(`/racks/${selectedRackId}/circuits`, {
      name: circName, color: circColor, ampere: circAmpere ? Number(circAmpere) : null,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['circuits', selectedRackId] });
      setCircName(''); setCircAmpere('');
    },
  });

  const deleteCircuit = useMutation({
    mutationFn: (id: number) => apiDelete(`/racks/${selectedRackId}/circuits/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['circuits', selectedRackId] }),
  });

  if (!selectedRackId) return null;

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setOpen(!open)}
        className="absolute top-3 right-3 z-10 bg-rack-surface/85 backdrop-blur border border-rack-border rounded-full px-3 py-1.5 text-xs text-rack-muted hover:text-rack-text"
        title="VLANs & Stromkreise verwalten"
      >
        Netz
      </button>

      {/* Panel */}
      {open && (
        <div className="absolute top-12 right-3 z-20 w-64 bg-rack-surface/95 backdrop-blur border border-rack-border rounded-lg p-3 text-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-rack-text font-medium">VLANs & Stromkreise</span>
            <button onClick={() => setOpen(false)} className="text-rack-muted hover:text-rack-text">×</button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mb-3">
            {(['vlans', 'circuits'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 py-0.5 rounded capitalize transition-colors ${
                  tab === t ? 'bg-blue-900/60 text-blue-300 border border-blue-600' : 'text-rack-muted hover:text-rack-text'
                }`}
              >
                {t === 'vlans' ? `VLANs (${vlans?.length ?? 0})` : `Stromkreise (${circuits?.length ?? 0})`}
              </button>
            ))}
          </div>

          {/* VLANs */}
          {tab === 'vlans' && (
            <div className="flex flex-col gap-2">
              {(vlans ?? []).map((v) => (
                <div key={v.id} className="flex items-center gap-1.5 bg-rack-bg rounded px-2 py-1">
                  <span className="w-3 h-3 rounded-sm shrink-0" style={{ background: v.color }} />
                  <span className="text-blue-300 w-10 shrink-0">VLAN {v.vlan_id}</span>
                  <span className="text-rack-text flex-1 truncate">{v.name}</span>
                  <button onClick={() => deleteVlan.mutate(v.id)} className="text-red-400 hover:text-red-300">×</button>
                </div>
              ))}
              <form
                onSubmit={(e) => { e.preventDefault(); if (!vlanId || !vlanName) return; addVlan.mutate(); }}
                className="flex flex-col gap-1 border-t border-rack-border pt-2 mt-1"
              >
                <div className="flex gap-1">
                  <input
                    type="number" placeholder="ID" value={vlanId} onChange={(e) => setVlanId(e.target.value)}
                    className="w-16 bg-rack-bg border border-rack-border rounded px-1.5 py-0.5 text-rack-text"
                  />
                  <input
                    placeholder="Name" value={vlanName} onChange={(e) => setVlanName(e.target.value)}
                    className="flex-1 bg-rack-bg border border-rack-border rounded px-1.5 py-0.5 text-rack-text"
                  />
                  <input type="color" value={vlanColor} onChange={(e) => setVlanColor(e.target.value)}
                    className="w-7 h-6 rounded cursor-pointer bg-transparent border border-rack-border" />
                </div>
                <button type="submit" className="bg-blue-900/50 hover:bg-blue-800/60 border border-blue-700/40 rounded px-2 py-1 text-blue-300">
                  + VLAN hinzufügen
                </button>
              </form>
            </div>
          )}

          {/* Circuits */}
          {tab === 'circuits' && (
            <div className="flex flex-col gap-2">
              {(circuits ?? []).map((c) => (
                <div key={c.id} className="flex items-center gap-1.5 bg-rack-bg rounded px-2 py-1">
                  <span className="w-3 h-3 rounded-sm shrink-0" style={{ background: c.color }} />
                  <span className="text-rack-text flex-1 truncate">{c.name}</span>
                  {c.ampere && <span className="text-rack-muted">{c.ampere}A</span>}
                  <button onClick={() => deleteCircuit.mutate(c.id)} className="text-red-400 hover:text-red-300">×</button>
                </div>
              ))}
              <form
                onSubmit={(e) => { e.preventDefault(); if (!circName) return; addCircuit.mutate(); }}
                className="flex flex-col gap-1 border-t border-rack-border pt-2 mt-1"
              >
                <div className="flex gap-1">
                  <input
                    placeholder="Name" value={circName} onChange={(e) => setCircName(e.target.value)}
                    className="flex-1 bg-rack-bg border border-rack-border rounded px-1.5 py-0.5 text-rack-text"
                  />
                  <input
                    type="number" placeholder="A" value={circAmpere} onChange={(e) => setCircAmpere(e.target.value)}
                    className="w-14 bg-rack-bg border border-rack-border rounded px-1.5 py-0.5 text-rack-text"
                  />
                  <input type="color" value={circColor} onChange={(e) => setCircColor(e.target.value)}
                    className="w-7 h-6 rounded cursor-pointer bg-transparent border border-rack-border" />
                </div>
                <button type="submit" className="bg-red-900/50 hover:bg-red-800/60 border border-red-700/40 rounded px-2 py-1 text-red-300">
                  + Stromkreis hinzufügen
                </button>
              </form>
            </div>
          )}
        </div>
      )}
    </>
  );
}

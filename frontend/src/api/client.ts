import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Rack, RackComponent, ComponentModel, Port, Cable, Vlan, Circuit } from '../types';

const BASE = '/api';

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(BASE + url, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) throw new Error(await res.text());
  if (res.status === 204) return undefined as T;
  return res.json();
}

// ---- Racks ----
export function useRacks() {
  return useQuery({ queryKey: ['racks'], queryFn: () => fetchJson<Rack[]>('/racks') });
}

export function useCreateRack() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Rack>) => fetchJson<Rack>('/racks', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['racks'] }),
  });
}

export function useDeleteRack() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => fetchJson<void>(`/racks/${id}`, { method: 'DELETE' }),
    onSuccess: (_r, id) => {
      qc.invalidateQueries({ queryKey: ['racks'] });
      qc.removeQueries({ queryKey: ['components', id] });
      qc.removeQueries({ queryKey: ['cables', id] });
      qc.removeQueries({ queryKey: ['vlans', id] });
      qc.removeQueries({ queryKey: ['circuits', id] });
    },
  });
}

// ---- Components ----
export function useComponents(rackId: number | null) {
  return useQuery({
    queryKey: ['components', rackId],
    queryFn: () => fetchJson<RackComponent[]>(`/racks/${rackId}/components`),
    enabled: rackId !== null,
  });
}

export function useCreateComponent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ rackId, data }: { rackId: number; data: Partial<RackComponent> }) =>
      fetchJson<RackComponent>(`/racks/${rackId}/components`, { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: (_r, { rackId }) => qc.invalidateQueries({ queryKey: ['components', rackId] }),
  });
}

export function useUpdateComponent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ rackId, compId, data }: { rackId: number; compId: number; data: Partial<RackComponent> }) =>
      fetchJson<RackComponent>(`/racks/${rackId}/components/${compId}`, { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: (_r, { rackId }) => qc.invalidateQueries({ queryKey: ['components', rackId] }),
  });
}

export function useDeleteComponent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ rackId, compId }: { rackId: number; compId: number }) =>
      fetchJson<void>(`/racks/${rackId}/components/${compId}`, { method: 'DELETE' }),
    onSuccess: (_r, { rackId }) => qc.invalidateQueries({ queryKey: ['components', rackId] }),
  });
}

// ---- Models ----
export function useModels() {
  return useQuery({ queryKey: ['models'], queryFn: () => fetchJson<ComponentModel[]>('/models') });
}

export function useModelPorts(modelId: number | null) {
  return useQuery({
    queryKey: ['ports', modelId],
    queryFn: () => fetchJson<Port[]>(`/models/${modelId}/ports`),
    enabled: modelId !== null,
  });
}

// ---- Cables ----
export function useCables(rackId: number | null) {
  return useQuery({
    queryKey: ['cables', rackId],
    queryFn: () => fetchJson<Cable[]>(`/racks/${rackId}/cables`),
    enabled: rackId !== null,
  });
}

export function useCreateCable() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ rackId, data }: { rackId: number; data: Partial<Cable> }) =>
      fetchJson<Cable>(`/racks/${rackId}/cables`, { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: (_r, { rackId }) => qc.invalidateQueries({ queryKey: ['cables', rackId] }),
  });
}

export function useDeleteCable() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ rackId, cableId }: { rackId: number; cableId: number }) =>
      fetchJson<void>(`/racks/${rackId}/cables/${cableId}`, { method: 'DELETE' }),
    onSuccess: (_r, { rackId }) => qc.invalidateQueries({ queryKey: ['cables', rackId] }),
  });
}

// ---- VLANs ----
export function useVlans(rackId: number | null) {
  return useQuery({
    queryKey: ['vlans', rackId],
    queryFn: () => fetchJson<Vlan[]>(`/racks/${rackId}/vlans`),
    enabled: rackId !== null,
  });
}

// ---- Circuits ----
export function useCircuits(rackId: number | null) {
  return useQuery({
    queryKey: ['circuits', rackId],
    queryFn: () => fetchJson<Circuit[]>(`/racks/${rackId}/circuits`),
    enabled: rackId !== null,
  });
}

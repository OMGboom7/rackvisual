import { useState, useEffect, useRef } from 'react';
import { useRacks, useCreateRack, useUpdateRack, useDeleteRack } from '../../api/client';
import { useStore } from '../../store/useStore';

export default function RackSwitcher() {
  const { data: racks } = useRacks();
  const createRack = useCreateRack();
  const updateRack = useUpdateRack();
  const deleteRack = useDeleteRack();
  const { selectedRackId, setSelectedRackId } = useStore();

  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [newWidth, setNewWidth] = useState<'10"' | '19"'>('19"');
  const [newU, setNewU] = useState(12);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const editRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (racks?.length && !selectedRackId) setSelectedRackId(racks[0].id);
  }, [racks, selectedRackId, setSelectedRackId]);

  useEffect(() => {
    if (editingId !== null) editRef.current?.focus();
  }, [editingId]);

  function startEdit(id: number, name: string) {
    setEditingId(id);
    setEditName(name);
  }

  function commitEdit() {
    if (!editingId || !editName.trim()) { setEditingId(null); return; }
    updateRack.mutate({ id: editingId, data: { name: editName.trim() } }, {
      onSettled: () => setEditingId(null),
    });
  }

  function handleDelete(id: number, name: string) {
    if (!confirm(`确定删除机柜 "${name}" 及其所有组件和线缆？`)) return;
    deleteRack.mutate(id, {
      onSuccess: () => {
        if (selectedRackId === id) {
          const remaining = (racks ?? []).filter((r) => r.id !== id);
          setSelectedRackId(remaining[0]?.id ?? null);
        }
      },
    });
  }

  return (
    <>
      {/* 桌面端：行内按钮 */}
      <div className="hidden md:flex absolute top-3 left-1/2 -translate-x-1/2 z-10 items-center gap-2 bg-rack-surface/85 backdrop-blur border border-rack-border rounded-full px-4 py-1.5">
        <span className="text-blue-400 font-bold text-sm mr-1">RackVisual</span>
        <div className="w-px h-4 bg-rack-border" />

        {(racks ?? []).map((r) => (
          <div key={r.id} className="group relative flex items-center">
            {editingId === r.id ? (
              <form
                onSubmit={(e) => { e.preventDefault(); commitEdit(); }}
                className="flex items-center gap-1"
              >
                <input
                  ref={editRef}
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onBlur={commitEdit}
                  onKeyDown={(e) => e.key === 'Escape' && setEditingId(null)}
                  className="bg-rack-bg border border-blue-600 rounded px-2 py-0.5 text-xs text-rack-text w-28"
                />
                <button type="submit" className="text-xs text-green-400">OK</button>
                <button type="button" onClick={() => setEditingId(null)} className="text-xs text-rack-muted">×</button>
              </form>
            ) : (
              <div className="flex items-center gap-0.5">
                <button
                  onClick={() => setSelectedRackId(r.id)}
                  className={`text-xs px-2 py-0.5 rounded-full transition-colors ${
                    selectedRackId === r.id
                      ? 'bg-blue-900/60 border border-blue-600 text-blue-300'
                      : 'text-rack-muted hover:text-rack-text'
                  }`}
                >
                  {r.name}
                </button>
                <button
                  onClick={() => startEdit(r.id, r.name)}
                  title="重命名"
                  className="opacity-0 group-hover:opacity-100 text-rack-muted hover:text-blue-400 transition-opacity text-xs px-0.5"
                >
                  e
                </button>
                <button
                  onClick={() => handleDelete(r.id, r.name)}
                  title="删除"
                  className="opacity-0 group-hover:opacity-100 text-rack-muted hover:text-red-400 transition-opacity text-xs px-0.5"
                >
                  ×
                </button>
              </div>
            )}
          </div>
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
              autoFocus value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="名称"
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
            <button type="submit" className="text-xs text-green-400 px-2">OK</button>
            <button type="button" onClick={() => setShowNew(false)} className="text-xs text-rack-muted px-1">×</button>
          </form>
        ) : (
          <button onClick={() => setShowNew(true)} className="text-xs text-green-400 hover:text-green-300 px-2">+ 新建</button>
        )}
      </div>

      {/* 移动端：下拉选择器 */}
      <div className="md:hidden absolute top-3 left-3 right-3 z-10 flex items-center gap-2">
        <select
          value={selectedRackId ?? ''}
          onChange={(e) => setSelectedRackId(Number(e.target.value))}
          className="flex-1 bg-rack-surface/90 backdrop-blur border border-rack-border rounded-lg px-3 py-2 text-sm text-rack-text appearance-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 10px center',
            paddingRight: '30px',
          }}
        >
          {(racks ?? []).map((r) => (
            <option key={r.id} value={r.id}>{r.name} ({r.height_u}U)</option>
          ))}
        </select>
        <button
          onClick={() => setShowNew(!showNew)}
          className="bg-rack-surface/90 backdrop-blur border border-rack-border rounded-lg px-3 py-2 text-sm text-green-400 shrink-0"
        >
          +
        </button>
      </div>

      {/* 移动端新建表单 */}
      {showNew && (
        <div className="md:hidden absolute top-16 left-3 right-3 z-10 bg-rack-surface/95 backdrop-blur border border-rack-border rounded-lg p-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!newName) return;
              createRack.mutate({ name: newName, width: newWidth, height_u: newU, color: '#1c2230' }, {
                onSuccess: (r) => { setSelectedRackId(r.id); setShowNew(false); setNewName(''); },
              });
            }}
            className="flex flex-col gap-2"
          >
            <input
              autoFocus value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="机柜名称"
              className="bg-rack-bg border border-rack-border rounded px-3 py-2 text-sm text-rack-text"
            />
            <div className="flex gap-2">
              <select
                value={newWidth} onChange={(e) => setNewWidth(e.target.value as '10"' | '19"')}
                className="flex-1 bg-rack-bg border border-rack-border rounded px-2 py-2 text-sm text-rack-text"
              >
                <option value='19"'>19 英寸</option>
                <option value='10"'>10 英寸</option>
              </select>
              <input
                type="number" min={1} max={48} value={newU} onChange={(e) => setNewU(Number(e.target.value))}
                className="w-20 bg-rack-bg border border-rack-border rounded px-2 py-2 text-sm text-rack-text"
                placeholder="U数"
              />
            </div>
            <div className="flex gap-2">
              <button type="submit" className="flex-1 bg-green-800 rounded-lg py-2 text-sm text-green-200">创建</button>
              <button type="button" onClick={() => setShowNew(false)} className="flex-1 bg-rack-bg rounded-lg py-2 text-sm text-rack-muted">取消</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

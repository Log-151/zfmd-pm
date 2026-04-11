import { useState, useMemo, useCallback, useRef } from "react";

export interface ColDef<T = any> {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
  csvValue?: (row: T) => string | number;
  className?: string;
}

const storageKey = (mod: string) => `colorder_v1_${mod}`;

export function useColumnOrder<T>(module: string, defaultCols: ColDef<T>[]) {
  const load = (): string[] => {
    try {
      const s = localStorage.getItem(storageKey(module));
      if (s) { const arr = JSON.parse(s); if (Array.isArray(arr)) return arr; }
    } catch {}
    return defaultCols.map(c => c.key);
  };

  const [order, setOrder] = useState<string[]>(load);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const dragSrcIdx = useRef<number | null>(null);
  const latestOrder = useRef<ColDef<T>[]>([]);

  const orderedCols = useMemo(() => {
    const byKey = new Map(defaultCols.map(c => [c.key, c]));
    const saved = order.filter(k => byKey.has(k));
    const fresh = defaultCols.filter(c => !saved.includes(c.key)).map(c => c.key);
    const result = [...saved, ...fresh].map(k => byKey.get(k)!);
    latestOrder.current = result;
    return result;
  }, [order, defaultCols]);

  const reorder = useCallback((keys: string[]) => {
    setOrder(keys);
    try { localStorage.setItem(storageKey(module), JSON.stringify(keys)); } catch {}
  }, [module]);

  const reset = useCallback(() => {
    const keys = defaultCols.map(c => c.key);
    setOrder(keys);
    try { localStorage.setItem(storageKey(module), JSON.stringify(keys)); } catch {}
  }, [defaultCols, module]);

  const getDragProps = (idx: number) => ({
    draggable: true as const,
    title: "拖拽可调整列顺序",
    onDragStart: (e: React.DragEvent) => { e.dataTransfer.effectAllowed = "move"; dragSrcIdx.current = idx; },
    onDragOver: (e: React.DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setDragOverIdx(idx); },
    onDragLeave: () => setDragOverIdx(null),
    onDrop: () => {
      if (dragSrcIdx.current !== null && dragSrcIdx.current !== idx) {
        const keys = latestOrder.current.map(c => c.key);
        const [moved] = keys.splice(dragSrcIdx.current, 1);
        keys.splice(idx, 0, moved);
        reorder(keys);
      }
      dragSrcIdx.current = null;
      setDragOverIdx(null);
    },
    onDragEnd: () => { dragSrcIdx.current = null; setDragOverIdx(null); },
    style: {
      cursor: dragSrcIdx.current !== null ? "grabbing" : "grab",
      borderLeft: dragOverIdx === idx ? "2px solid hsl(var(--primary))" : undefined,
      userSelect: "none" as const,
    },
  });

  return { orderedCols, reorder, reset, getDragProps };
}

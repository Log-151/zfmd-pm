import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, Settings, GripVertical } from "lucide-react";
import type { CustomFieldDef } from "@/hooks/use-custom-fields";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defs: CustomFieldDef[];
  onAdd: (def: { fieldLabel: string; fieldType: string; options?: string; isRequired: boolean }) => Promise<boolean>;
  onDelete: (id: number) => Promise<void>;
  onReorder?: (orderedIds: number[]) => Promise<void>;
}

const FIELD_TYPES = [
  { value: "text", label: "文本" },
  { value: "number", label: "数字" },
  { value: "date", label: "日期" },
  { value: "select", label: "下拉选择" },
  { value: "boolean", label: "是/否" },
];

export function CustomFieldsManager({ open, onOpenChange, defs, onAdd, onDelete, onReorder }: Props) {
  const [label, setLabel] = useState("");
  const [type, setType] = useState("text");
  const [options, setOptions] = useState("");
  const [required, setRequired] = useState(false);
  const [adding, setAdding] = useState(false);
  const [localOrder, setLocalOrder] = useState<number[]>([]);
  const [reordering, setReordering] = useState(false);
  const dragIndex = useRef<number | null>(null);

  const orderedDefs = localOrder.length > 0
    ? localOrder.map(id => defs.find(d => d.id === id)).filter(Boolean) as CustomFieldDef[]
    : [...defs].sort((a, b) => a.sortOrder - b.sortOrder);

  const handleAdd = async () => {
    if (!label.trim()) return;
    setAdding(true);
    await onAdd({ fieldLabel: label.trim(), fieldType: type, options: options || undefined, isRequired: required });
    setLabel("");
    setType("text");
    setOptions("");
    setRequired(false);
    setAdding(false);
    setLocalOrder([]);
  };

  const handleDragStart = (idx: number) => { dragIndex.current = idx; };
  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragIndex.current === null || dragIndex.current === idx) return;
    const newOrder = orderedDefs.map(d => d.id);
    const [moved] = newOrder.splice(dragIndex.current, 1);
    newOrder.splice(idx, 0, moved);
    dragIndex.current = idx;
    setLocalOrder(newOrder);
  };
  const handleDrop = async () => {
    if (!onReorder || localOrder.length === 0) return;
    setReordering(true);
    await onReorder(localOrder);
    setReordering(false);
  };

  const typeLabel = (t: string) => FIELD_TYPES.find(x => x.value === t)?.label ?? t;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-4 h-4" /> 自定义字段管理
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {orderedDefs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">暂无自定义字段</p>
          ) : (
            <div className="space-y-2">
              {onReorder && <p className="text-xs text-muted-foreground">拖拽左侧手柄可调整字段顺序</p>}
              {orderedDefs.map((def, idx) => (
                <div
                  key={def.id}
                  draggable={!!onReorder}
                  onDragStart={() => handleDragStart(idx)}
                  onDragOver={e => handleDragOver(e, idx)}
                  onDrop={handleDrop}
                  className="flex items-center justify-between rounded-md border px-3 py-2 bg-background cursor-default"
                  style={{ userSelect: "none" }}
                >
                  <div className="flex items-center gap-2">
                    {onReorder && <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab flex-shrink-0" />}
                    <span className="text-sm font-medium">{def.fieldLabel}</span>
                    <Badge variant="outline" className="text-xs">{typeLabel(def.fieldType)}</Badge>
                    {def.isRequired && <Badge variant="secondary" className="text-xs">必填</Badge>}
                    {def.options && <span className="text-xs text-muted-foreground">({def.options})</span>}
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive flex-shrink-0" onClick={() => onDelete(def.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
              {reordering && <p className="text-xs text-muted-foreground text-center">保存顺序中...</p>}
            </div>
          )}

          <div className="border-t pt-4 space-y-3">
            <p className="text-sm font-medium">添加新字段</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">字段名称</Label>
                <Input value={label} onChange={e => setLabel(e.target.value)} placeholder="如：项目编号" className="h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">字段类型</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FIELD_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {type === "select" && (
              <div className="space-y-1">
                <Label className="text-xs">选项（逗号分隔）</Label>
                <Input value={options} onChange={e => setOptions(e.target.value)} placeholder="选项1,选项2,选项3" className="h-8 text-sm" />
              </div>
            )}
            <div className="flex items-center gap-2">
              <Checkbox id="required" checked={required} onCheckedChange={v => setRequired(!!v)} />
              <Label htmlFor="required" className="text-sm cursor-pointer">必填</Label>
            </div>
            <Button size="sm" onClick={handleAdd} disabled={adding || !label.trim()}>
              <Plus className="w-3.5 h-3.5 mr-1" /> 添加
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>关闭</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

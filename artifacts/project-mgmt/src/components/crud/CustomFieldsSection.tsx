import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import type { CustomFieldDef } from "@/hooks/use-custom-fields";

interface Props {
  defs: CustomFieldDef[];
  values: Record<string, string | boolean | number>;
  onChange: (values: Record<string, string | boolean | number>) => void;
}

export function CustomFieldsSection({ defs, values, onChange }: Props) {
  if (!defs.length) return null;

  const set = (name: string, value: string | boolean | number) => {
    onChange({ ...values, [name]: value });
  };

  return (
    <div className="space-y-3 border-t pt-3 mt-1">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">自定义字段</p>
      <div className="grid grid-cols-2 gap-3">
        {defs.map(def => {
          const val = values[def.fieldName];
          return (
            <div key={def.fieldName} className="space-y-1.5">
              <Label className="text-sm">
                {def.fieldLabel}
                {def.isRequired && <span className="text-destructive ml-0.5">*</span>}
              </Label>
              {def.fieldType === "text" && (
                <Input value={(val as string) ?? ""} onChange={e => set(def.fieldName, e.target.value)} />
              )}
              {def.fieldType === "number" && (
                <Input type="number" value={(val as string) ?? ""} onChange={e => set(def.fieldName, e.target.value)} />
              )}
              {def.fieldType === "date" && (
                <Input type="date" value={(val as string) ?? ""} onChange={e => set(def.fieldName, e.target.value)} />
              )}
              {def.fieldType === "boolean" && (
                <div className="flex items-center gap-2 h-10">
                  <Checkbox checked={!!val} onCheckedChange={v => set(def.fieldName, !!v)} />
                  <span className="text-sm">{val ? "是" : "否"}</span>
                </div>
              )}
              {def.fieldType === "select" && (
                <Select value={(val as string) ?? ""} onValueChange={v => set(def.fieldName, v)}>
                  <SelectTrigger><SelectValue placeholder="请选择" /></SelectTrigger>
                  <SelectContent>
                    {(def.options ?? "").split(",").filter(Boolean).map(opt => (
                      <SelectItem key={opt.trim()} value={opt.trim()}>{opt.trim()}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

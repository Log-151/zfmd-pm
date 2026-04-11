import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, Download, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export interface ImportColumn {
  key: string;
  label: string;
  required?: boolean;
  transform?: (val: string) => unknown;
}

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  columns: ImportColumn[];
  templateColumns?: { key: string; label: string }[];
  onImportRow: (row: Record<string, unknown>) => Promise<void>;
  templateFilename: string;
}

type RowResult = { status: "pending" | "success" | "error"; message?: string };

function normalizeHeader(s: string): string {
  return s
    .replace(/\uFEFF/g, "")
    .trim()
    .replace(/（/g, "(")
    .replace(/）/g, ")")
    .replace(/，/g, ",")
    .replace(/：/g, ":")
    .replace(/【/g, "[")
    .replace(/】/g, "]")
    .toLowerCase();
}

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  for (const line of lines) {
    if (!line.trim()) continue;
    const cells: string[] = [];
    let inQuote = false;
    let cell = "";
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuote && line[i + 1] === '"') { cell += '"'; i++; }
        else inQuote = !inQuote;
      } else if (ch === "," && !inQuote) {
        cells.push(cell.trim());
        cell = "";
      } else {
        cell += ch;
      }
    }
    cells.push(cell.trim());
    rows.push(cells);
  }
  return rows;
}

export function ImportDialog({ open, onOpenChange, title, columns, templateColumns, onImportRow, templateFilename }: ImportDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<string[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [results, setResults] = useState<RowResult[]>([]);
  const [importing, setImporting] = useState(false);
  const [done, setDone] = useState(false);

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const parsed = parseCSV(text);
      if (parsed.length < 2) return;
      setHeaders(parsed[0]);
      setRows(parsed.slice(1).filter(r => r.some(c => c)));
      setResults([]);
      setDone(false);
    };
    reader.readAsText(file, "UTF-8");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const downloadTemplate = () => {
    const tplCols = templateColumns ?? columns;
    const header = tplCols.map(c => `"${c.label}"`).join(",");
    const blob = new Blob(["\uFEFF" + header + "\n"], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = templateFilename;
    link.click();
  };

  const handleImport = async () => {
    setImporting(true);
    const initial: RowResult[] = rows.map(() => ({ status: "pending" }));
    setResults([...initial]);

    const normHeaders = headers.map(normalizeHeader);
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const obj: Record<string, unknown> = {};
      for (const col of columns) {
        const normLabel = normalizeHeader(col.label);
        const normKey = normalizeHeader(col.key);
        const idx = normHeaders.findIndex(h => h === normLabel || h === normKey);
        const val = idx >= 0 ? (row[idx] ?? "").trim() : "";
        obj[col.key] = col.transform ? col.transform(val) : val;
      }
      try {
        await onImportRow(obj);
        setResults(prev => { const n = [...prev]; n[i] = { status: "success" }; return n; });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "导入失败";
        setResults(prev => { const n = [...prev]; n[i] = { status: "error", message: msg }; return n; });
      }
    }
    setImporting(false);
    setDone(true);
  };

  const successCount = results.filter(r => r.status === "success").length;
  const errorCount = results.filter(r => r.status === "error").length;

  const reset = () => {
    setRows([]);
    setHeaders([]);
    setResults([]);
    setDone(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!importing) { onOpenChange(v); if (!v) reset(); } }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>批量导入 - {title}</DialogTitle>
        </DialogHeader>

        {rows.length === 0 ? (
          <div className="space-y-4">
            <div
              className="border-2 border-dashed rounded-lg p-10 text-center cursor-pointer hover:bg-muted/30 transition-colors"
              onDragOver={e => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">拖拽 CSV 文件到此处，或点击选择文件</p>
              <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
            </div>
            <div className="flex justify-center">
              <Button variant="outline" size="sm" onClick={downloadTemplate}>
                <Download className="w-4 h-4 mr-2" /> 下载模板
              </Button>
            </div>
            <div className="text-xs text-muted-foreground space-y-1.5">
              <p><span className="font-medium">必填列：</span>{columns.filter(c => c.required).map(c => c.label).join("、") || "无"}</p>
              <p><span className="font-medium">模板列顺序：</span>{(templateColumns ?? columns).map(c => c.label).join("、")}</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {done && (
              <div className="flex items-center gap-4 rounded-md bg-muted p-3 text-sm">
                <span className="flex items-center gap-1 text-green-600"><CheckCircle className="w-4 h-4" /> 成功 {successCount} 条</span>
                {errorCount > 0 && <span className="flex items-center gap-1 text-destructive"><XCircle className="w-4 h-4" /> 失败 {errorCount} 条</span>}
              </div>
            )}
            <p className="text-sm text-muted-foreground">共 {rows.length} 行数据，预览前 5 行：</p>
            <div className="overflow-auto max-h-60 rounded border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8">#</TableHead>
                    {headers.map((h, i) => <TableHead key={i}>{h}</TableHead>)}
                    {results.length > 0 && <TableHead>状态</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.slice(0, 5).map((row, i) => (
                    <TableRow key={i}>
                      <TableCell>{i + 1}</TableCell>
                      {row.map((cell, j) => <TableCell key={j} className="max-w-[120px] truncate text-xs">{cell}</TableCell>)}
                      {results[i] && (
                        <TableCell>
                          {results[i].status === "success" && <Badge className="bg-green-500 text-white">成功</Badge>}
                          {results[i].status === "error" && <Badge variant="destructive">失败</Badge>}
                          {results[i].status === "pending" && <Badge variant="outline">等待</Badge>}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {rows.length > 5 && <p className="text-xs text-muted-foreground">... 及另外 {rows.length - 5} 行</p>}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => { onOpenChange(false); reset(); }} disabled={importing}>取消</Button>
          {rows.length > 0 && !done && (
            <Button onClick={handleImport} disabled={importing}>
              {importing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {importing ? `导入中...` : `开始导入 (${rows.length} 条)`}
            </Button>
          )}
          {done && <Button variant="outline" onClick={reset}>重新选择</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

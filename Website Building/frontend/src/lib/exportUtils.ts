// src/lib/exportUtils.ts
// Export helpers for batch detection results (CSV, JSON, PDF)

export interface ExportableBatchItem {
  id: string;
  no: number;
  fileName: string;
  fruitName: string;
  label: string;
  manualLabel: string | null;
  effectiveLabel: string;
  classConf: number;
  yoloClass: string;
  status: "completed" | "failed" | "rejected";
}

// --- CSV ---

function escapeCsvCell(value: string | number): string {
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportToCSV(items: ExportableBatchItem[], filename = "ciphercrew_results"): void {
  const headers = [
    "No.","ID","File Name","Fruit Detected","AI Category",
    "Manual Override","Effective Category","Confidence (%)","Status",
  ];
  const rows = items.map((item) => [
    item.no, item.id, item.fileName, item.fruitName, item.label,
    item.manualLabel ?? "", item.effectiveLabel,
    (item.classConf * 100).toFixed(1), item.status,
  ]);
  const csvContent = [headers, ...rows].map((row) => row.map(escapeCsvCell).join(",")).join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  triggerDownload(blob, `${filename}.csv`);
}

// --- JSON ---

export function exportToJSON(items: ExportableBatchItem[], filename = "ciphercrew_results"): void {
  const payload = {
    exportedAt: new Date().toISOString(),
    generator: "CipherCrew AI Detection Platform",
    totalItems: items.length,
    summary: buildSummary(items),
    results: items,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  triggerDownload(blob, `${filename}.json`);
}

// --- PDF (HTML print window) ---

export function exportToPDF(items: ExportableBatchItem[], filename = "ciphercrew_results"): void {
  const summary = buildSummary(items);
  const now = new Date().toLocaleString();

  const categoryBadge = (label: string, isOverride = false): string => {
    const l = label.toLowerCase();
    const norm = (l === "fresh" || l === "good") ? "good" :
                 (l === "rotten" || l === "bad") ? "bad" :
                 (l === "adulterated" || l === "unknown" || l === "adulterant") ? "unknown" : l;
    const text = norm === "good" ? "GOOD" : norm === "bad" ? "BAD" : norm === "unknown" ? "UNKNOWN" : label.toUpperCase();
    const colorMap: Record<string, string> = {
      good: "#16a34a", fresh: "#16a34a",
      bad: "#dc2626", rotten: "#dc2626",
      unknown: "#d97706", adulterated: "#d97706",
    };
    const bg = colorMap[norm] ?? "#6b7280";
    const override = isOverride
      ? ` <span style="font-size:9px;background:#f3f4f6;color:#374151;border-radius:4px;padding:1px 5px;margin-left:4px;">Override</span>`

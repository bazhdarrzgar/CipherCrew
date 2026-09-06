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
      : "";
    return `<span style="background:${bg};color:#fff;padding:2px 10px;border-radius:20px;font-size:11px;font-weight:700;">${text}${override}</span>`;
  };

  const rows = items.map((item) => `
    <tr>
      <td style="text-align:center;">${item.no}</td>
      <td style="font-family:monospace;font-size:11px;">${item.id}</td>
      <td style="max-width:160px;word-break:break-all;font-size:11px;">${item.fileName}</td>
      <td style="font-weight:600;">${item.fruitName}</td>
      <td>${categoryBadge(item.effectiveLabel, !!item.manualLabel)}</td>
      <td>${(item.classConf * 100).toFixed(1)}%</td>
      <td style="color:${item.status === "rejected" ? "#dc2626" : item.status === "failed" ? "#d97706" : "#16a34a"};">${item.status}</td>
    </tr>`).join("");

  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/>
<title>${filename}</title>
<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:-apple-system,sans-serif;color:#111;padding:32px 40px}.header{display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:24px;border-bottom:2px solid #111;padding-bottom:12px}.brand{font-size:28px;font-weight:700}.meta{text-align:right;font-size:11px;color:#6b7280}.summary{display:flex;gap:16px;margin-bottom:24px}.stat{flex:1;background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:14px;text-align:center}.stat-value{font-size:24px;font-weight:700}.stat-label{font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;margin-top:2px}table{width:100%;border-collapse:collapse;font-size:12px}thead tr{background:#111;color:#fff}thead th{padding:10px 12px;text-align:left;font-size:10px;text-transform:uppercase}tbody tr:nth-child(even){background:#f9fafb}tbody td{padding:10px 12px;border-bottom:1px solid #f3f4f6;vertical-align:middle}.footer{margin-top:20px;font-size:10px;color:#9ca3af;text-align:center}</style>
</head><body>
<div class="header"><div class="brand">CipherCrew</div><div class="meta"><div>AI Fruit Detection Report</div><div>Generated: ${now}</div></div></div>
<div class="summary">
  <div class="stat"><div class="stat-value">${summary.total}</div><div class="stat-label">Total</div></div>
  <div class="stat" style="border-color:#bbf7d0"><div class="stat-value" style="color:#16a34a">${summary.good}</div><div class="stat-label">Good</div></div>
  <div class="stat" style="border-color:#fecaca"><div class="stat-value" style="color:#dc2626">${summary.bad}</div><div class="stat-label">Bad</div></div>
  <div class="stat" style="border-color:#fde68a"><div class="stat-value" style="color:#d97706">${summary.unknown}</div><div class="stat-label">Unknown</div></div>
  <div class="stat" style="border-color:#e9d5ff"><div class="stat-value" style="color:#7c3aed">${summary.overridden}</div><div class="stat-label">Overridden</div></div>
  <div class="stat" style="border-color:#fee2e2"><div class="stat-value" style="color:#dc2626">${summary.rejected}</div><div class="stat-label">Rejected</div></div>
</div>
<table><thead><tr><th>No.</th><th>ID</th><th>File Name</th><th>Fruit</th><th>Category</th><th>Confidence</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table>
<div class="footer">&copy; ${new Date().getFullYear()} CipherCrew - AI Fruit Unknown Data Detection Platform</div>
</body></html>`;

  const printWindow = window.open("", "_blank", "width=900,height=700");
  if (!printWindow) return;
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.onload = () => { printWindow.focus(); printWindow.print(); };
}

// --- Helpers ---

function buildSummary(items: ExportableBatchItem[]) {
  const isGood = (lbl: string) => {
    const l = lbl.toLowerCase();
    return l === "good" || l === "fresh";
  };
  const isBad = (lbl: string) => {
    const l = lbl.toLowerCase();
    return l === "bad" || l === "rotten";
  };
  const isUnknown = (lbl: string) => {
    const l = lbl.toLowerCase();
    return l === "unknown" || l === "adulterated" || l === "adulterant";
  };
  const good = items.filter((i) => isGood(i.effectiveLabel)).length;
  const bad = items.filter((i) => isBad(i.effectiveLabel)).length;
  const unknown = items.filter((i) => isUnknown(i.effectiveLabel)).length;

  return {
    total: items.length,
    good,
    bad,
    unknown,
    fresh: good,
    rotten: bad,
    adulterated: unknown,
    overridden: items.filter((i) => i.manualLabel !== null).length,
    rejected: items.filter((i) => i.status === "rejected").length,
  };
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

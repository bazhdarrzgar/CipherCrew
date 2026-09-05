"use client";

import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Download, FileJson, FileText, Trash2, Eye, RotateCcw, 
  CheckCircle, AlertCircle, Clock, XCircle,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight
} from "lucide-react";
import { exportToCSV, exportToJSON, exportToPDF, ExportableBatchItem } from "@/lib/exportUtils";

export type QualityLabel = "good" | "bad" | "unknown" | "fresh" | "rotten" | "adulterated";

export interface BatchItem {
  id: string;
  no: number;
  file?: File;
  previewUrl: string;
  fileName: string;
  fruitName: string;
  label: QualityLabel | "";
  manualLabel: QualityLabel | null;
  classConf: number;
  yoloClass: string;
  status: "pending" | "processing" | "completed" | "failed" | "rejected";
  error?: string;
  dbId?: number;
  createdAt?: string;
  detectionIndex?: number;
  parentImageId?: string;
}

interface BatchTableProps {
  items: BatchItem[];
  activeIndex: number;
  onSelectItem: (index: number) => void;
  onOverrideLabel: (index: number, label: QualityLabel) => void;
  onRejectItem: (index: number) => void;
  onRestoreItem: (index: number) => void;
  onRemoveItem?: (index: number) => void;
}

export const normalizeQualityLabel = (label?: string | null): "good" | "bad" | "unknown" | "" => {
  if (!label) return "";
  const l = label.toLowerCase();
  if (l === "fresh" || l === "good") return "good";
  if (l === "rotten" || l === "bad") return "bad";
  if (l === "adulterated" || l === "unknown" || l === "adulterant") return "unknown";
  return "";
};

export const getDisplayQualityLabel = (label?: string | null): string => {
  const norm = normalizeQualityLabel(label);
  if (norm === "good") return "Good";
  if (norm === "bad") return "Bad";
  if (norm === "unknown") return "Unknown";
  return label || "";
};

const CATEGORY_OPTIONS: { value: QualityLabel; label: string }[] = [
  { value: "good", label: "GOOD" },
  { value: "bad", label: "BAD" },
  { value: "unknown", label: "UNKNOWN" },
];

const CATEGORY_STYLES: Record<string, string> = {
  good: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/60",
  bad: "bg-red-100 text-red-800 border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800/60",
  unknown: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/60",
  fresh: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/60",
  rotten: "bg-red-100 text-red-800 border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800/60",
  adulterated: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/60",
  "": "bg-gray-100 text-gray-500 border-gray-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700",
};

const STATUS_ICON: Record<string, React.ReactNode> = {
  pending:    <Clock className="w-4 h-4 text-gray-400 dark:text-zinc-500" />,
  processing: <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} className="w-4 h-4 border-2 border-black/30 border-t-black dark:border-white/30 dark:border-t-white rounded-full" />,
  completed:  <CheckCircle className="w-4 h-4 text-emerald-500" />,
  failed:     <AlertCircle className="w-4 h-4 text-amber-500" />,
  rejected:   <XCircle className="w-4 h-4 text-red-400" />,
};

export const BatchTable = ({ items, activeIndex, onSelectItem, onOverrideLabel, onRejectItem, onRestoreItem, onRemoveItem }: BatchTableProps) => {
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  const pending    = items.filter((i) => i.status === "pending").length;
  const processing = items.filter((i) => i.status === "processing").length;
  const good       = items.filter((i) => normalizeQualityLabel(i.manualLabel ?? i.label) === "good").length;
  const bad        = items.filter((i) => normalizeQualityLabel(i.manualLabel ?? i.label) === "bad").length;
  const unknown    = items.filter((i) => normalizeQualityLabel(i.manualLabel ?? i.label) === "unknown").length;
  const overridden = items.filter((i) => i.manualLabel !== null).length;
  const rejected   = items.filter((i) => i.status === "rejected").length;

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));

  // Ensure current page is valid when items or pageSize change
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  // If user navigates active item to a different page, auto-adjust page to show active item
  useEffect(() => {
    if (activeIndex >= 0 && items.length > 0) {
      const activePage = Math.floor(activeIndex / pageSize) + 1;
      if (activePage <= totalPages && activePage !== currentPage) {
        setCurrentPage(activePage);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex, pageSize]);

  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, items.length);
  const paginatedItems = useMemo(() => {
    return items.slice(startIndex, endIndex);
  }, [items, startIndex, endIndex]);

  const buildExportItems = (): ExportableBatchItem[] =>
    items.map((item) => ({
      id: item.id,
      no: item.no,
      fileName: item.fileName,
      fruitName: item.fruitName || item.yoloClass || "Unknown",
      label: item.label,
      manualLabel: item.manualLabel,
      effectiveLabel: item.manualLabel ?? item.label,
      classConf: item.classConf,
      yoloClass: item.yoloClass,
      status: item.status === "pending" || item.status === "processing" ? "completed" : item.status,
    }));

  if (items.length === 0) return null;

  // Generate visible page numbers for pagination
  const getPageNumbers = () => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (currentPage <= 3) {
      return [1, 2, 3, 4, "...", totalPages];
    }
    if (currentPage >= totalPages - 2) {
      return [1, "...", totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages];
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full mt-6 sm:mt-10 flex flex-col gap-4 sm:gap-6"
    >
      {/* ── Summary Stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2 sm:gap-3">
        {[
          { label: "Total",       value: items.length,  color: "text-black dark:text-white",       border: "border-black/20 dark:border-zinc-700" },
          { label: "Pending",     value: pending + processing, color: "text-gray-500 dark:text-zinc-400",  border: "border-gray-200 dark:border-zinc-800" },
          { label: "Good",        value: good,          color: "text-emerald-600 dark:text-emerald-400", border: "border-emerald-200 dark:border-emerald-800/50" },
          { label: "Bad",         value: bad,           color: "text-red-600 dark:text-red-400",     border: "border-red-200 dark:border-red-800/50"     },
          { label: "Unknown",     value: unknown,       color: "text-amber-600 dark:text-amber-400",   border: "border-amber-200 dark:border-amber-800/50"   },
          { label: "Overridden",  value: overridden,    color: "text-violet-600 dark:text-violet-400",  border: "border-violet-200 dark:border-violet-800/50"  },
          { label: "Rejected",    value: rejected,      color: "text-red-400 dark:text-red-400",     border: "border-red-100 dark:border-red-900/50"     },
        ].map((s) => (
          <div key={s.label} className={`bg-white/50 dark:bg-zinc-900/70 backdrop-blur-xl border ${s.border} rounded-xl sm:rounded-2xl p-3 sm:p-4 text-center shadow-sm`}>
            <p className={`text-xl sm:text-2xl font-bold font-instrument ${s.color}`}>{s.value}</p>
            <p className="text-[9px] sm:text-[10px] text-gray-500 dark:text-zinc-400 uppercase tracking-widest mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Table Card ── */}
      <div className="bg-white/40 dark:bg-zinc-900/70 backdrop-blur-3xl border border-white/60 dark:border-zinc-800 rounded-2xl sm:rounded-3xl shadow-xl overflow-hidden flex flex-col">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-black/5 dark:border-white/10 gap-3 bg-white/30 dark:bg-zinc-900/50">
          <div className="flex items-center justify-between sm:justify-start gap-3 sm:gap-4 flex-wrap">
            <h2 className="text-base sm:text-lg font-bold font-instrument tracking-tight text-black/90 dark:text-zinc-100">Batch Results</h2>
            
            {/* Page Size Selector (10 / 20 / 100) */}
            <div className="flex items-center gap-1.5 text-xs text-black/60 dark:text-zinc-300 bg-white/60 dark:bg-zinc-800/80 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl border border-white/60 dark:border-zinc-700 shadow-sm">
              <span className="font-medium">Show:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-white dark:bg-zinc-800 border border-black/10 dark:border-zinc-700 rounded-lg px-2 py-0.5 text-xs font-bold text-black dark:text-white focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white cursor-pointer shadow-inner"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={100}>100</option>
              </select>
              <span>elements</span>
            </div>
          </div>

          {/* Export Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-stretch sm:justify-end">
            <button
              onClick={() => exportToCSV(buildExportItems())}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 text-xs font-bold bg-white/60 hover:bg-white dark:bg-zinc-800 dark:hover:bg-zinc-700 text-black dark:text-white border border-white/60 dark:border-zinc-700 rounded-xl shadow-sm transition-all hover:scale-105 active:scale-95"
            >
              <FileText className="w-3.5 h-3.5" /> <span>CSV</span>
            </button>
            <button
              onClick={() => exportToJSON(buildExportItems())}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 text-xs font-bold bg-white/60 hover:bg-white dark:bg-zinc-800 dark:hover:bg-zinc-700 text-black dark:text-white border border-white/60 dark:border-zinc-700 rounded-xl shadow-sm transition-all hover:scale-105 active:scale-95"
            >
              <FileJson className="w-3.5 h-3.5" /> <span>JSON</span>
            </button>
            <button
              onClick={() => exportToPDF(buildExportItems())}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 text-xs font-bold bg-black text-white hover:bg-black/80 dark:bg-white dark:text-black dark:hover:bg-zinc-200 rounded-xl shadow-sm transition-all hover:scale-105 active:scale-95"
            >
              <Download className="w-3.5 h-3.5" /> <span>PDF Report</span>
            </button>
          </div>
        </div>

        {/* ── Mobile Card View (shown on screens < 768px) ── */}
        <div className="block md:hidden divide-y divide-black/5 dark:divide-white/5 p-3 sm:p-4 space-y-3 max-h-[560px] overflow-y-auto">
          <AnimatePresence mode="popLayout">
            {paginatedItems.map((item, localIdx) => {
              const originalIdx = startIndex + localIdx;
              const effectiveLabel = item.manualLabel ?? item.label;
              const isActive = originalIdx === activeIndex;
              const isRejected = item.status === "rejected";

              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className={`p-3 rounded-2xl border transition-all flex flex-col gap-2.5 ${
                    isActive 
                      ? "bg-black/[0.04] dark:bg-white/[0.06] border-black/20 dark:border-white/20 shadow-sm" 
                      : "bg-white/40 dark:bg-zinc-800/40 border-black/5 dark:border-zinc-800"
                  } ${isRejected ? "opacity-40" : ""}`}
                >
                  {/* Top Row: Thumbnail + Details + Status */}
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl overflow-hidden bg-black/5 dark:bg-black/30 shrink-0 ring-2 transition-all ${isActive ? "ring-black dark:ring-white" : "ring-transparent"}`}>
                      <img src={item.previewUrl} alt={item.fileName} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-semibold text-black dark:text-white capitalize truncate">
                          {item.fruitName || item.yoloClass || "Fruit"}
                        </span>
                        <div className="flex items-center gap-1 shrink-0">
                          {STATUS_ICON[item.status]}
                          <span className="text-[10px] text-black/50 dark:text-zinc-400 capitalize">{item.status}</span>
                        </div>
                      </div>
                      <p className="text-[11px] text-black/60 dark:text-zinc-400 truncate mt-0.5" title={item.fileName}>
                        {item.fileName}
                      </p>
                      <span className="font-mono text-[10px] text-black/40 dark:text-zinc-500">
                        #{item.no} • {item.id}
                      </span>
                    </div>
                  </div>

                  {/* Middle Row: Category + Confidence */}
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-black/5 dark:border-white/5 flex-wrap">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border uppercase ${CATEGORY_STYLES[normalizeQualityLabel(effectiveLabel)] ?? CATEGORY_STYLES[""]}`}>
                        {getDisplayQualityLabel(effectiveLabel) || "Detecting…"}
                      </span>
                      {item.manualLabel && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-violet-100 text-violet-700 border border-violet-200 dark:bg-violet-950/50 dark:text-violet-300 dark:border-violet-800/60">
                          Override
                        </span>
                      )}
                      {item.status === "completed" && (
                        <select
                          value={normalizeQualityLabel(effectiveLabel) || effectiveLabel}
                          onChange={(e) => onOverrideLabel(originalIdx, e.target.value as QualityLabel)}
                          className="text-[10px] bg-white/70 dark:bg-zinc-800 border border-black/10 dark:border-zinc-700 rounded-lg px-1.5 py-0.5 font-semibold text-black/70 dark:text-zinc-200 cursor-pointer"
                        >
                          {CATEGORY_OPTIONS.map((cat) => (
                            <option key={cat.value} value={cat.value}>{cat.label}</option>
                          ))}
                        </select>
                      )}
                    </div>

                    {item.status === "completed" && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-black/50 dark:text-zinc-400 font-mono">Conf:</span>
                        <span className="font-mono text-[11px] font-bold text-black/80 dark:text-zinc-200">
                          {(item.classConf * 100).toFixed(1)}%
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Bottom Row: Actions */}
                  <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-black/5 dark:border-white/5">
                    {item.status === "completed" && (
                      <button
                        onClick={() => onSelectItem(originalIdx)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/15 text-[11px] font-semibold text-black dark:text-white transition-colors"
                      >
                        <Eye className="w-3 h-3" />
                        <span>View</span>
                      </button>
                    )}
                    {item.status === "rejected" ? (
                      <button
                        onClick={() => onRestoreItem(originalIdx)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/30 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 transition-colors"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Restore</span>
                      </button>
                    ) : (
                      item.status === "completed" && (
                        <button
                          onClick={() => onRejectItem(originalIdx)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/30 text-[11px] font-semibold text-amber-600 dark:text-amber-400 transition-colors"
                        >
                          <XCircle className="w-3 h-3" />
                          <span>Reject</span>
                        </button>
                      )
                    )}
                    {onRemoveItem && (
                      <button
                        onClick={() => onRemoveItem(originalIdx)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 dark:bg-red-950/30 text-[11px] font-semibold text-red-600 dark:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Remove</span>
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* ── Desktop & Tablet Table Body (shown on screens >= 768px) ── */}
        <div className="hidden md:block max-h-[540px] overflow-y-auto overflow-x-auto relative scrollbar-thin">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md z-10 border-b border-black/10 dark:border-white/10 shadow-sm">
              <tr className="text-left">
                <th className="px-5 py-3.5 text-[10px] uppercase tracking-widest font-semibold text-black/50 dark:text-zinc-400">No.</th>
                <th className="px-5 py-3.5 text-[10px] uppercase tracking-widest font-semibold text-black/50 dark:text-zinc-400">Image / ID</th>
                <th className="px-5 py-3.5 text-[10px] uppercase tracking-widest font-semibold text-black/50 dark:text-zinc-400">File Name</th>
                <th className="px-5 py-3.5 text-[10px] uppercase tracking-widest font-semibold text-black/50 dark:text-zinc-400">Fruit</th>
                <th className="px-5 py-3.5 text-[10px] uppercase tracking-widest font-semibold text-black/50 dark:text-zinc-400">Category</th>
                <th className="px-5 py-3.5 text-[10px] uppercase tracking-widest font-semibold text-black/50 dark:text-zinc-400">Confidence</th>
                <th className="px-5 py-3.5 text-[10px] uppercase tracking-widest font-semibold text-black/50 dark:text-zinc-400">Status</th>
                <th className="px-5 py-3.5 text-[10px] uppercase tracking-widest font-semibold text-black/50 dark:text-zinc-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence mode="popLayout">
                {paginatedItems.map((item, localIdx) => {
                  const originalIdx = startIndex + localIdx;
                  const effectiveLabel = item.manualLabel ?? item.label;
                  const isActive = originalIdx === activeIndex;
                  const isRejected = item.status === "rejected";

                  return (
                    <motion.tr
                      key={item.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.15 }}
                      className={`border-b border-black/5 dark:border-white/5 transition-colors ${isActive ? "bg-black/5 dark:bg-white/5" : "hover:bg-black/[0.02] dark:hover:bg-white/[0.03]"} ${isRejected ? "opacity-40" : ""}`}
                    >
                      {/* No. */}
                      <td className="px-5 py-3 text-black/50 dark:text-zinc-400 font-mono text-xs">{item.no}</td>

                      {/* Thumbnail + ID */}
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg overflow-hidden bg-black/5 dark:bg-black/30 shrink-0 ring-2 transition-all ${isActive ? "ring-black dark:ring-white" : "ring-transparent"}`}>
                            <img src={item.previewUrl} alt={item.fileName} className="w-full h-full object-cover" />
                          </div>
                          <span className="font-mono text-[10px] text-black/40 dark:text-zinc-500">{item.id}</span>
                        </div>
                      </td>

                      {/* File Name */}
                      <td className="px-5 py-3 text-black/70 dark:text-zinc-300 max-w-[160px]">
                        <p className="truncate text-xs" title={item.fileName}>{item.fileName}</p>
                      </td>

                      {/* Fruit Name */}
                      <td className="px-5 py-3 text-black dark:text-white font-semibold text-xs capitalize">
                        {item.fruitName || item.yoloClass || "—"}
                      </td>

                      {/* Category Badge + Override */}
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border uppercase ${CATEGORY_STYLES[normalizeQualityLabel(effectiveLabel)] ?? CATEGORY_STYLES[""]}`}>
                            {getDisplayQualityLabel(effectiveLabel) || "Detecting…"}
                          </span>
                          {item.manualLabel && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-violet-100 text-violet-700 border border-violet-200 dark:bg-violet-950/50 dark:text-violet-300 dark:border-violet-800/60">
                              Override
                            </span>
                          )}
                          {item.status === "completed" && (
                            <select
                              value={normalizeQualityLabel(effectiveLabel) || effectiveLabel}
                              onChange={(e) => onOverrideLabel(originalIdx, e.target.value as QualityLabel)}
                              className="text-[11px] bg-white/70 hover:bg-white dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-black/10 dark:border-zinc-700 rounded-lg px-2 py-0.5 font-semibold text-black/70 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white cursor-pointer shadow-sm"
                            >
                              {CATEGORY_OPTIONS.map((cat) => (
                                <option key={cat.value} value={cat.value}>{cat.label}</option>
                              ))}
                            </select>
                          )}
                        </div>
                      </td>

                      {/* Confidence Score */}
                      <td className="px-5 py-3">
                        {item.status === "completed" ? (
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-black/10 dark:bg-white/10 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="h-full bg-black dark:bg-white rounded-full"
                                style={{ width: `${item.classConf * 100}%` }}
                              />
                            </div>
                            <span className="font-mono text-xs font-semibold text-black/80 dark:text-zinc-300">
                              {(item.classConf * 100).toFixed(1)}%
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-black/30 dark:text-zinc-600 font-mono">—</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1.5">
                          {STATUS_ICON[item.status]}
                          <span className="text-xs capitalize text-black/60 dark:text-zinc-400">{item.status}</span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1.5">
                          {item.status === "completed" && (
                            <button
                              onClick={() => onSelectItem(originalIdx)}
                              title="View in Studio"
                              className="p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors text-black/50 hover:text-black dark:text-zinc-400 dark:hover:text-white"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {item.status === "rejected" ? (
                            <button
                              onClick={() => onRestoreItem(originalIdx)}
                              title="Restore"
                              className="p-1.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors text-emerald-500"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            item.status === "completed" && (
                              <button
                                onClick={() => onRejectItem(originalIdx)}
                                title="Reject / Exclude"
                                className="p-1.5 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors text-amber-500 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                              </button>
                            )
                          )}
                          {onRemoveItem && (
                            <button
                              onClick={() => onRemoveItem(originalIdx)}
                              title="Remove fruit from dataset"
                              className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            </tbody>
          </table>
        </div>

        {/* ── Pagination Footer ── */}
        <div className="flex flex-col sm:flex-row items-center justify-between px-4 sm:px-6 py-3 sm:py-3.5 border-t border-black/5 dark:border-white/10 bg-white/40 dark:bg-zinc-900/60 gap-3 sm:gap-4 text-xs">
          {/* Item Range Info */}
          <div className="text-black/60 dark:text-zinc-400 font-medium text-center sm:text-left text-[11px] sm:text-xs">
            Showing <strong className="text-black dark:text-white font-semibold">{items.length > 0 ? startIndex + 1 : 0}</strong>–<strong className="text-black dark:text-white font-semibold">{endIndex}</strong> of <strong className="text-black dark:text-white font-semibold">{items.length}</strong> elements
          </div>

          {/* Navigation Controls: << < [pages] > >> */}
          <div className="flex items-center gap-1 flex-wrap justify-center">
            {/* First Page << */}
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage <= 1}
              title="First page"
              className="p-1.5 rounded-lg border border-black/10 dark:border-zinc-700 bg-white/70 hover:bg-white dark:bg-zinc-800 dark:hover:bg-zinc-700 text-black/70 dark:text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>

            {/* Previous Page < */}
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              title="Previous page (<)"
              className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-lg border border-black/10 dark:border-zinc-700 bg-white/70 hover:bg-white dark:bg-zinc-800 dark:hover:bg-zinc-700 text-black dark:text-white font-semibold disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Prev</span>
            </button>

            {/* Page number buttons */}
            <div className="flex items-center gap-1 mx-0.5 sm:mx-1">
              {getPageNumbers().map((p, i) =>
                p === "..." ? (
                  <span key={`dots-${i}`} className="px-1.5 text-black/40 dark:text-zinc-500 font-bold text-xs">...</span>
                ) : (
                  <button
                    key={`page-${p}`}
                    onClick={() => setCurrentPage(Number(p))}
                    className={`w-6 h-6 sm:w-7 sm:h-7 rounded-lg text-xs font-bold transition-all ${
                      currentPage === p
                        ? "bg-black text-white dark:bg-white dark:text-black shadow-sm"
                        : "bg-white/70 hover:bg-white dark:bg-zinc-800 dark:hover:bg-zinc-700 text-black/70 dark:text-zinc-300 border border-black/5 dark:border-zinc-700"
                    }`}
                  >
                    {p}
                  </button>
                )
              )}
            </div>

            {/* Next Page > */}
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              title="Next page (>)"
              className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-lg border border-black/10 dark:border-zinc-700 bg-white/70 hover:bg-white dark:bg-zinc-800 dark:hover:bg-zinc-700 text-black dark:text-white font-semibold disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Last Page >> */}
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage >= totalPages}
              title="Last page"
              className="p-1.5 rounded-lg border border-black/10 dark:border-zinc-700 bg-white/70 hover:bg-white dark:bg-zinc-800 dark:hover:bg-zinc-700 text-black/70 dark:text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

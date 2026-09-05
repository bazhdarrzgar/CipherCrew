"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, Database, Search, Trash2, Download, Eye, RefreshCw, 
  FileText, FileJson
} from "lucide-react";
import { QualityLabel } from "@/components/BatchTable";
import { exportToCSV, exportToJSON, exportToPDF, ExportableBatchItem } from "@/lib/exportUtils";

export interface HistoryRecord {
  id: number;
  batch_id?: string;
  filename: string;
  fruit_type: string;
  predicted_label: QualityLabel;
  confidence: number;
  manual_label: QualityLabel | null;
  effective_label: QualityLabel;
  is_rejected: boolean;
  created_at: string;
  annotated_image?: string | null;
  metadata?: {
    summary?: Record<string, number>;
    overall?: {
      class: string;
      label: string;
      class_conf: number;
      probabilities: Record<string, number>;
    };
    detections?: Array<{
      class: string;
      label?: string;
      class_conf: number;
      yolo_class: string;
      yolo_conf: number;
      bbox: number[];
      fallback?: boolean;
      probabilities?: Record<string, number>;
    }>;
    used_fallback?: boolean;
  };
}

interface HistoryStats {
  total: number;
  good?: number;
  bad?: number;
  unknown?: number;
  fresh?: number;
  rotten?: number;
  adulterated?: number;
  overridden: number;
  rejected: number;
}

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadRecord: (record: HistoryRecord) => void;
}

const CATEGORY_STYLES: Record<string, string> = {
  good: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/60",
  bad: "bg-red-100 text-red-800 border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800/60",
  unknown: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/60",
  fresh: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/60",
  rotten: "bg-red-100 text-red-800 border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800/60",
  adulterated: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/60",
  rejected: "bg-gray-100 text-gray-500 border-gray-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700",
};

const normalizeHistoryLabel = (l?: string) => {
  if (!l) return "";
  const s = l.toLowerCase();
  if (s === "fresh" || s === "good") return "good";
  if (s === "rotten" || s === "bad") return "bad";
  if (s === "adulterated" || s === "unknown" || s === "adulterant") return "unknown";
  return s;
};

const getDisplayHistoryLabel = (l?: string) => {
  const norm = normalizeHistoryLabel(l);
  if (norm === "good") return "Good";
  if (norm === "bad") return "Bad";
  if (norm === "unknown") return "Unknown";
  return l || "";
};

export const HistoryModal = ({ isOpen, onClose, onLoadRecord }: HistoryModalProps) => {
  const [records, setRecords] = useState<HistoryRecord[]>([]);
  const [stats, setStats] = useState<HistoryStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [labelFilter, setLabelFilter] = useState<string>("");
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("limit", "100");
      params.set("include_image", "true");
      if (labelFilter) params.set("label", labelFilter);
      if (search.trim()) params.set("search", search.trim());

      const res = await fetch(`http://127.0.0.1:8000/history?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setRecords(data.items || []);
      }

      const statsRes = await fetch("http://127.0.0.1:8000/history/stats");
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }
    } catch (err) {
      console.error("Failed to load history from SQLite:", err);
    } finally {
      setLoading(false);
    }
  }, [labelFilter, search]);

  useEffect(() => {
    if (isOpen) {
      fetchHistory();
    }
  }, [isOpen, fetchHistory]);

  const handleDeleteRecord = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Delete record #${id} from database?`)) return;
    setDeletingId(id);
    try {
      const res = await fetch(`http://127.0.0.1:8000/history/${id}`, { method: "DELETE" });
      if (res.ok) {
        setRecords((prev) => prev.filter((r) => r.id !== id));
        if (stats) setStats({ ...stats, total: Math.max(0, stats.total - 1) });
      }
    } catch (err) {
      console.error("Failed to delete record:", err);
    } finally {
      setDeletingId(null);
    }
  };

  const handleClearAll = async () => {
    if (!confirm("Are you sure you want to delete ALL scan history from the SQLite database? This cannot be undone.")) return;
    try {
      const res = await fetch("http://127.0.0.1:8000/history", { method: "DELETE" });
      if (res.ok) {
        setRecords([]);
        setStats({ total: 0, fresh: 0, rotten: 0, adulterated: 0, overridden: 0, rejected: 0 });
      }
    } catch (err) {
      console.error("Failed to clear database history:", err);
    }
  };

  const handleExport = (format: "csv" | "json" | "pdf") => {
    const exportItems: ExportableBatchItem[] = records.map((r, i) => ({
      no: i + 1,
      id: `DB-${r.id}`,
      fileName: r.filename,
      fruitName: r.fruit_type || "Unknown",
      label: r.predicted_label,
      manualLabel: r.manual_label,
      effectiveLabel: r.effective_label,
      classConf: r.confidence,
      yoloClass: r.fruit_type,
      status: r.is_rejected ? "rejected" : "completed",
    }));

    if (format === "csv") exportToCSV(exportItems, "sqlite_detections_history");
    if (format === "json") exportToJSON(exportItems, "sqlite_detections_history");
    if (format === "pdf") exportToPDF(exportItems, "SQLite Detections History");
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 md:p-8 bg-black/70 dark:bg-black/85 backdrop-blur-md overflow-hidden"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.94, opacity: 0, y: 16 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.94, opacity: 0, y: 16 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-5xl h-[82vh] max-h-[82vh] flex flex-col min-h-0 bg-white dark:bg-zinc-900 backdrop-blur-2xl rounded-2xl sm:rounded-3xl shadow-2xl border border-black/10 dark:border-zinc-800 overflow-hidden text-black dark:text-white my-auto"
        >
          {/* ── Modal Header ── */}
          <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-5 border-b border-black/10 dark:border-white/10 bg-white/40 dark:bg-zinc-900/50 shrink-0">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <div className="p-2 sm:p-2.5 bg-black text-white dark:bg-zinc-800 dark:text-white rounded-xl sm:rounded-2xl shadow-sm shrink-0">
                <Database className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base sm:text-xl font-bold font-instrument tracking-tight text-black dark:text-white">
                    Database History
                  </h2>
                  <span className="text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 font-mono font-medium rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/60">
                    detections.db
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-gray-500 dark:text-zinc-400 font-inter truncate max-w-[220px] sm:max-w-none">
                  Persisted scans across sessions with full export
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 sm:gap-2">
              <button
                onClick={fetchHistory}
                disabled={loading}
                title="Refresh database records"
                className="p-1.5 sm:p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-xl transition-colors disabled:opacity-50 text-gray-600 dark:text-zinc-300"
              >
                <RefreshCw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${loading ? "animate-spin" : ""}`} />
              </button>
              <button
                onClick={onClose}
                className="p-1.5 sm:p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-xl transition-colors text-gray-500 dark:text-zinc-400"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
          </div>

          {/* ── Summary Stats Pill Strip ── */}
          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-1.5 sm:gap-2 px-3 sm:px-6 py-2.5 sm:py-3 bg-black/[0.02] dark:bg-zinc-900/40 border-b border-black/5 dark:border-white/10 shrink-0">
              {[
                { label: "Total Saved", value: stats.total, color: "text-black dark:text-white" },
                { label: "Good", value: stats.good ?? stats.fresh ?? 0, color: "text-emerald-600 dark:text-emerald-400" },
                { label: "Bad", value: stats.bad ?? stats.rotten ?? 0, color: "text-red-600 dark:text-red-400" },
                { label: "Unknown", value: stats.unknown ?? stats.adulterated ?? 0, color: "text-amber-600 dark:text-amber-400" },
                { label: "Overridden", value: stats.overridden, color: "text-violet-600 dark:text-violet-400" },
                { label: "Rejected", value: stats.rejected, color: "text-gray-500 dark:text-zinc-400" },
              ].map((s) => (
                <div key={s.label} className="bg-white/70 dark:bg-zinc-800/80 border border-black/5 dark:border-zinc-700/60 rounded-xl p-2 text-center">
                  <p className={`text-base sm:text-lg font-bold font-instrument ${s.color}`}>{s.value}</p>
                  <p className="text-[8px] sm:text-[9px] uppercase tracking-wider text-gray-400 dark:text-zinc-500 font-semibold mt-0.5 truncate">{s.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* ── Search, Filters & Export Toolbar ── */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3 px-3 sm:px-6 py-2.5 sm:py-3 border-b border-black/5 dark:border-white/10 bg-white/20 dark:bg-zinc-900/30 shrink-0">
            {/* Search */}
            <div className="relative flex-1 min-w-0">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-zinc-500" />
              <input
                type="text"
                placeholder="Search filename or fruit..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white/80 dark:bg-zinc-800/90 border border-black/10 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/10 dark:focus:ring-white/10 text-black dark:text-white transition-all placeholder:text-gray-400 dark:placeholder:text-zinc-500"
              />
            </div>

            {/* Filter chips & Export buttons */}
            <div className="flex items-center justify-between sm:justify-end gap-1.5 flex-wrap">
              {/* Filter chips */}
              <div className="flex items-center gap-1">
                {[
                  { label: "All", value: "" },
                  { label: "Good", value: "good" },
                  { label: "Bad", value: "bad" },
                  { label: "Unknown", value: "unknown" },
                ].map((f) => (
                  <button
                    key={f.label}
                    onClick={() => setLabelFilter(f.value)}
                    className={`px-2 sm:px-2.5 py-1 rounded-lg sm:rounded-xl text-[11px] font-semibold transition-all ${
                      labelFilter === f.value
                        ? "bg-black text-white dark:bg-white dark:text-black shadow-sm"
                        : "bg-white/60 dark:bg-zinc-800/70 text-gray-600 dark:text-zinc-300 hover:bg-white dark:hover:bg-zinc-700"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Export & Clear */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleExport("csv")}
                  disabled={records.length === 0}
                  className="flex items-center gap-1 px-2 sm:px-2.5 py-1 text-[11px] font-bold bg-white/70 hover:bg-white dark:bg-zinc-800 dark:hover:bg-zinc-700 text-black dark:text-white border border-black/10 dark:border-zinc-700 rounded-lg sm:rounded-xl transition-all disabled:opacity-40"
                >
                  <FileText className="w-3 h-3" /> CSV
                </button>
                <button
                  onClick={() => handleExport("json")}
                  disabled={records.length === 0}
                  className="flex items-center gap-1 px-2 sm:px-2.5 py-1 text-[11px] font-bold bg-white/70 hover:bg-white dark:bg-zinc-800 dark:hover:bg-zinc-700 text-black dark:text-white border border-black/10 dark:border-zinc-700 rounded-lg sm:rounded-xl transition-all disabled:opacity-40"
                >
                  <FileJson className="w-3 h-3" /> JSON
                </button>
                <button
                  onClick={() => handleExport("pdf")}
                  disabled={records.length === 0}
                  className="flex items-center gap-1 px-2 sm:px-2.5 py-1 text-[11px] font-bold bg-white/70 hover:bg-white dark:bg-zinc-800 dark:hover:bg-zinc-700 text-black dark:text-white border border-black/10 dark:border-zinc-700 rounded-lg sm:rounded-xl transition-all disabled:opacity-40"
                >
                  <Download className="w-3 h-3" /> PDF
                </button>
                <button
                  onClick={handleClearAll}
                  disabled={records.length === 0}
                  title="Clear all database history"
                  className="flex items-center gap-1 px-2 sm:px-2.5 py-1 text-[11px] font-bold text-red-600 dark:text-red-400 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-950/60 border border-red-200 dark:border-red-900/50 rounded-lg sm:rounded-xl transition-all disabled:opacity-40"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>

          {/* ── Table Content ── */}
          <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-6 scrollbar-thin">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 text-gray-400 dark:text-zinc-500">
                <RefreshCw className="w-7 h-7 sm:w-8 sm:h-8 animate-spin mb-3 text-black dark:text-white" />
                <p className="text-xs sm:text-sm font-medium">Querying local SQLite database...</p>
              </div>
            ) : records.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-gray-400 dark:text-zinc-500">
                <Database className="w-10 h-10 stroke-1 mb-2 text-gray-300 dark:text-zinc-600" />
                <p className="text-base font-semibold text-gray-600 dark:text-zinc-300 font-instrument">No Detection History Found</p>
                <p className="text-xs text-gray-400 dark:text-zinc-500 mt-1 max-w-sm text-center px-4">
                  Scanned images are automatically stored into detections.db. Upload images to begin populating your local database.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto scrollbar-thin">
                <table className="w-full text-left text-xs min-w-[640px]">
                  <thead>
                    <tr className="border-b border-black/10 dark:border-white/10 text-gray-500 dark:text-zinc-400 uppercase tracking-wider text-[10px]">
                      <th className="pb-3 px-3">ID</th>
                      <th className="pb-3 px-3">Thumbnail</th>
                      <th className="pb-3 px-3">File Name</th>
                      <th className="pb-3 px-3">Fruit</th>
                      <th className="pb-3 px-3">Classification</th>
                      <th className="pb-3 px-3">Confidence</th>
                      <th className="pb-3 px-3">Date Saved</th>
                      <th className="pb-3 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5 dark:divide-white/5">
                    {records.map((r) => {
                      const rawLabel = r.effective_label || r.predicted_label;
                      const normLabel = normalizeHistoryLabel(rawLabel);
                      const displayLabel = getDisplayHistoryLabel(rawLabel);
                      const isOverridden = Boolean(r.manual_label);
                      const isDeleting = deletingId === r.id;

                      return (
                        <tr 
                          key={r.id} 
                          className={`hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-colors ${r.is_rejected ? "opacity-50" : ""}`}
                        >
                          <td className="py-3 px-3 font-mono font-bold text-gray-400 dark:text-zinc-500">
                            #{r.id}
                          </td>
                          <td className="py-3 px-3">
                            <div className="w-10 h-10 rounded-xl overflow-hidden bg-black/5 dark:bg-black/30 border border-black/10 dark:border-zinc-700 flex items-center justify-center shrink-0">
                              {r.annotated_image ? (
                                <img
                                  src={`data:image/jpeg;base64,${r.annotated_image}`}
                                  alt={r.filename}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <Database className="w-4 h-4 text-gray-300 dark:text-zinc-600" />
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-3 font-medium text-black dark:text-zinc-100 truncate max-w-[140px] sm:max-w-[180px]">
                            {r.filename}
                          </td>
                          <td className="py-3 px-3 text-gray-600 dark:text-zinc-300 font-semibold capitalize">
                            {r.fruit_type || "Unknown"}
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase ${CATEGORY_STYLES[normLabel] || CATEGORY_STYLES[""]}`}>
                                {displayLabel}
                              </span>
                              {isOverridden && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-violet-100 text-violet-700 border border-violet-200 dark:bg-violet-950/50 dark:text-violet-300 dark:border-violet-800/60">
                                  Override
                                </span>
                              )}
                              {r.is_rejected && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-red-100 text-red-700 border border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800/60">
                                  Rejected
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-3 font-mono font-bold text-black dark:text-zinc-200">
                            {(r.confidence * 100).toFixed(1)}%
                          </td>
                          <td className="py-3 px-3 text-gray-400 dark:text-zinc-400 text-[11px] whitespace-nowrap">
                            {new Date(r.created_at).toLocaleString(undefined, {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => {
                                  onLoadRecord(r);
                                  onClose();
                                }}
                                title="Load this scan into the active viewer"
                                className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 text-xs font-semibold bg-black text-white hover:bg-black/80 dark:bg-white dark:text-black dark:hover:bg-zinc-200 rounded-xl transition-all shadow-sm hover:scale-105 active:scale-95"
                              >
                                <Eye className="w-3.5 h-3.5" /> Load
                              </button>
                              <button
                                onClick={(e) => handleDeleteRecord(r.id, e)}
                                disabled={isDeleting}
                                title="Delete from SQLite database"
                                className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/30 text-red-500 dark:text-red-400 rounded-lg transition-colors disabled:opacity-40"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ── Modal Footer ── */}
          <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-3.5 border-t border-black/10 dark:border-white/10 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md text-xs text-gray-500 dark:text-zinc-400 shrink-0 z-10 shadow-[0_-4px_12px_rgba(0,0,0,0.04)] dark:shadow-[0_-4px_12px_rgba(0,0,0,0.3)]">
            <span className="font-medium text-black/70 dark:text-zinc-300">Showing {records.length} saved records</span>
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 px-5 py-2 font-bold bg-black text-white hover:bg-black/85 dark:bg-white dark:text-black dark:hover:bg-zinc-200 rounded-xl transition-all shadow-md hover:scale-105 active:scale-95 cursor-pointer text-xs sm:text-sm"
            >
              <X className="w-3.5 h-3.5" />
              <span>Close</span>
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};


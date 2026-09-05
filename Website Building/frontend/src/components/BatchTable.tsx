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
};

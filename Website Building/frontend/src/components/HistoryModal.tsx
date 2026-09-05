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
};

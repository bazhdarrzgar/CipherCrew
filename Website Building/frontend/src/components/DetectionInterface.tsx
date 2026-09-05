"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UploadCloud, Info, ChevronLeft, ChevronRight, X, Images, Loader2, Database, Trash2, Camera } from "lucide-react";
import { BatchTable, BatchItem, QualityLabel } from "@/components/BatchTable";
import { HistoryModal, HistoryRecord } from "@/components/HistoryModal";
import { CameraModal } from "@/components/CameraModal";

// ─── API Types ────────────────────────────────────────────────────────────────

interface DetectionResult {
  class: string;
  label?: string;
  class_conf: number;
  yolo_class: string;
  yolo_conf: number;
  bbox: number[];
  gradcam_b64: string | null;
  crop_b64: string | null;
  fallback?: boolean;
  probabilities?: Record<string, number>;
}

interface ApiResponse {
  annotated_image: string;
  detections: DetectionResult[];
  summary: Record<string, number>;
  summary_labels?: Record<string, number>;
  overall?: {
    class: string;
    label: string;
    class_conf: number;
    probabilities: Record<string, number>;
  };
  total: number;
  used_fallback?: boolean;
  db_id?: number;
}

// ─── ID generator ─────────────────────────────────────────────────────────────

let _idCounter = 0;
function generateId(): string {
  _idCounter += 1;
  return `IMG-${String(_idCounter).padStart(3, "0")}`;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export const DetectionInterface = () => {
  const [items, setItems] = useState<BatchItem[]>([]);
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isQueueRunning, setIsQueueRunning] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [dbCount, setDbCount] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const processingRef = useRef(false);

  const fetchDbStats = useCallback(async () => {
    try {
      const res = await fetch("http://127.0.0.1:8000/history/stats");
      if (res.ok) {
        const stats = await res.json();
        setDbCount(stats.total);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchDbStats();
  }, [fetchDbStats]);

  // Active completed item for result viewer
  const activeItem = items[activeIndex] ?? null;
  const activeResult: ApiResponse | null =
    activeItem && (activeItem.status === "completed" || activeItem.status === "rejected")
      ? (activeItem as BatchItem & { _result: ApiResponse })._result ?? null
      : null;

  // ── Add files to queue ──
  const addFiles = useCallback((files: File[]) => {
    setGlobalError(null);
    const newItems: BatchItem[] = files.map((file) => ({
      id: generateId(),
      no: 0, // patched below
      file,
      previewUrl: URL.createObjectURL(file),
      fileName: file.name,
      fruitName: "",
      label: "",
      manualLabel: null,
      classConf: 0,
      yoloClass: "",
      status: "pending",
    }));

    setItems((prev) => {
      const combined = [...prev, ...newItems];
      // Reassign serial numbers
      return combined.map((item, idx) => ({ ...item, no: idx + 1 }));
    });
  }, []);

  // ── Sequential Queue Processor ──
};

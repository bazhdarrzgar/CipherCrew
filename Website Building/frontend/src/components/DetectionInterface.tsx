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
  useEffect(() => {
    if (processingRef.current || isQueueRunning) return;

    const pendingIndex = items.findIndex((i) => i.status === "pending");
    if (pendingIndex === -1) return;

    processingRef.current = true;
    setIsQueueRunning(true);

    // Mark this item as processing
    setItems((prev) =>
      prev.map((item, i) =>
        i === pendingIndex ? { ...item, status: "processing" } : item
      )
    );
    setActiveIndex(pendingIndex);

    const item = items[pendingIndex];
    if (!item.file) {
      processingRef.current = false;
      setIsQueueRunning(false);
      return;
    }

    const runDetection = async () => {
      const startTime = Date.now();
      const formData = new FormData();
      formData.append("file", item.file as File);
      formData.append("return_gradcam", "true");

      try {
        const apiUrl = new URL(
          process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/detect",
          typeof window !== "undefined" ? window.location.origin : "http://localhost:3000"
        );
        apiUrl.searchParams.set("return_gradcam", "true");

        const res = await fetch(apiUrl.toString(), { method: "POST", body: formData });

        if (!res.ok) {
          let detailMsg = "Failed to process image";
          try {
            const errData = await res.json();
            detailMsg = errData.detail || detailMsg;
          } catch {
            detailMsg = await res.text();
          }
          throw new Error(detailMsg);
        }

        const data: ApiResponse = await res.json();

        // Ensure user sees the feature extraction & laser scanning animation
        const elapsed = Date.now() - startTime;
        if (elapsed < 1200) {
          await new Promise((resolve) => setTimeout(resolve, 1200 - elapsed));
        }

        const detections = data.detections || [];
        let newCompletedItems: (BatchItem & { _result: ApiResponse })[] = [];

        if (detections.length <= 1) {
          const firstDet = detections[0];
          const rawClass = (data.overall?.class ?? firstDet?.class ?? "").toLowerCase();
          const overallClass = (
            rawClass === "fresh" || rawClass === "good" ? "good" :
            rawClass === "rotten" || rawClass === "bad" ? "bad" :
            rawClass === "adulterated" || rawClass === "adulterant" || rawClass === "unknown" ? "unknown" : rawClass
          ) as QualityLabel;
          const conf = data.overall?.class_conf ?? firstDet?.class_conf ?? 0;
          const yoloCls = firstDet?.yolo_class ?? "";
          const fruitName = yoloCls === "full_image" || !yoloCls ? "Unknown" : yoloCls;
          const cropUrl = firstDet?.crop_b64
            ? `data:image/jpeg;base64,${firstDet.crop_b64}`
            : item.previewUrl;

          newCompletedItems = [
            {
              ...item,
              status: "completed",
              label: overallClass,
              fruitName,
              classConf: conf,
              yoloClass: yoloCls,
              previewUrl: cropUrl,
              dbId: data.db_id,
              detectionIndex: 0,
              parentImageId: item.id,
              _result: data,
            } as BatchItem & { _result: ApiResponse },
          ];
        } else {
          // Multiple fruits detected: add ALL detected fruits as individual items to table dataset
          newCompletedItems = detections.map((det, dIdx) => {
            const rawClass = (det.class || "").toLowerCase();
            const detLabel = (
              rawClass === "fresh" || rawClass === "good" ? "good" :
              rawClass === "rotten" || rawClass === "bad" ? "bad" :
              rawClass === "adulterated" || rawClass === "adulterant" || rawClass === "unknown" ? "unknown" : rawClass
            ) as QualityLabel;
            const yoloCls = det.yolo_class ?? "";
            const fruitName = yoloCls === "full_image" || !yoloCls ? "Unknown" : yoloCls;
            const cropUrl = det.crop_b64
              ? `data:image/jpeg;base64,${det.crop_b64}`
              : item.previewUrl;

            return {
              id: `${item.id}-F${dIdx + 1}`,
              no: 0,
              file: item.file,
              previewUrl: cropUrl,
              fileName: `${item.fileName} #${dIdx + 1}`,
              fruitName,
              label: detLabel,
              manualLabel: null,
              classConf: det.class_conf,
              yoloClass: yoloCls,
              status: "completed",
              dbId: data.db_id,
              detectionIndex: dIdx,
              parentImageId: item.id,
              _result: data,
            } as BatchItem & { _result: ApiResponse };
          });
        }

        setItems((prev) => {
          const before = prev.slice(0, pendingIndex);
          const after = prev.slice(pendingIndex + 1);
          const combined = [...before, ...newCompletedItems, ...after];
          return combined.map((it, idx) => ({ ...it, no: idx + 1 }));
        });
        setActiveIndex(pendingIndex);
        fetchDbStats();
      } catch (err: unknown) {
        setItems((prev) =>
          prev.map((it, i) =>
            i === pendingIndex
              ? { ...it, status: "failed", error: err instanceof Error ? err.message : "Unknown error" }
              : it
          )
        );
      } finally {
        processingRef.current = false;
        setIsQueueRunning(false);
      }
    };

    runDetection();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  // ── File Input Handler ──
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(Array.from(e.target.files));
      e.target.value = "";
    }
  };

  // ── Drag & Drop ──
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files).filter(
      (f) =>
        f.type.startsWith("image/") ||
        /\.(jpe?g|png|webp|avif|heic|heif|jfif|bmp|tiff?|gif)$/i.test(f.name)
    );
    if (files.length > 0) addFiles(files);
  };

  // ── Override & Reject (with SQLite sync) ──
  const handleOverrideLabel = async (index: number, label: QualityLabel) => {
    const targetItem = items[index];
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, manualLabel: label } : item))
    );
    if (targetItem?.dbId) {
      try {
        await fetch(`http://127.0.0.1:8000/history/${targetItem.dbId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ manual_label: label }),
        });
        fetchDbStats();
      } catch (err) {
        console.error("Failed to sync override with SQLite:", err);
      }
    }
  };

  const handleRejectItem = async (index: number) => {
    const targetItem = items[index];
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, status: "rejected" } : item))
    );
    if (targetItem?.dbId) {
      try {
        await fetch(`http://127.0.0.1:8000/history/${targetItem.dbId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ is_rejected: true }),
        });
        fetchDbStats();
      } catch (err) {
        console.error("Failed to sync rejection with SQLite:", err);
      }
    }
  };

  const handleRestoreItem = async (index: number) => {
    const targetItem = items[index];
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, status: "completed" } : item))
    );
    if (targetItem?.dbId) {
      try {
        await fetch(`http://127.0.0.1:8000/history/${targetItem.dbId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ is_rejected: false }),
        });
        fetchDbStats();
      } catch (err) {
        console.error("Failed to sync restore with SQLite:", err);
      }
    }
  };

  const handleLoadHistoryRecord = (record: HistoryRecord) => {
    const meta = record.metadata || {};
    const rawDets = (meta.detections as DetectionResult[]) || [];
    const apiResponse: ApiResponse = {
      annotated_image: record.annotated_image || "",
      detections: rawDets.length > 0 ? rawDets : [
        {
          class: record.predicted_label,
          label: record.predicted_label.toUpperCase(),
          class_conf: record.confidence,
          yolo_class: record.fruit_type,
          yolo_conf: record.confidence,
          bbox: [0, 0, 100, 100],
          gradcam_b64: null,
          crop_b64: null,
          fallback: meta.used_fallback ?? false,
          probabilities: meta.overall?.probabilities || { [record.predicted_label]: record.confidence },
        },
      ],
      summary: meta.summary || { [record.predicted_label]: 1 },
      overall: meta.overall || {
        class: record.predicted_label,
        label: record.predicted_label.toUpperCase(),
        class_conf: record.confidence,
        probabilities: { [record.predicted_label]: record.confidence },
      },
      total: rawDets.length || 1,
      used_fallback: meta.used_fallback ?? false,
      db_id: record.id,
    };

    let newItemsToLoad: (BatchItem & { _result: ApiResponse })[] = [];
    if (rawDets.length > 1) {
      newItemsToLoad = rawDets.map((det, dIdx) => {
        const rawClass = (det.class || "").toLowerCase();
        const detLabel = (
          rawClass === "fresh" || rawClass === "good" ? "good" :
          rawClass === "rotten" || rawClass === "bad" ? "bad" :
          rawClass === "adulterated" || rawClass === "adulterant" || rawClass === "unknown" ? "unknown" : rawClass
        ) as QualityLabel;
        const yoloCls = det.yolo_class ?? "";
        const fruitName = yoloCls === "full_image" || !yoloCls ? "Unknown" : yoloCls;
        return {
          id: `DB-${record.id}-F${dIdx + 1}`,
          no: 0,
          previewUrl: record.annotated_image ? `data:image/jpeg;base64,${record.annotated_image}` : "",
          fileName: `${record.filename} #${dIdx + 1}`,
          fruitName,
          label: detLabel,
          manualLabel: record.manual_label,
          classConf: det.class_conf,
          yoloClass: yoloCls,
          status: record.is_rejected ? "rejected" : "completed",
          dbId: record.id,
          createdAt: record.created_at,
          detectionIndex: dIdx,
          parentImageId: `DB-${record.id}`,
          _result: apiResponse,
        } as BatchItem & { _result: ApiResponse };
      });
    } else {
      newItemsToLoad = [{
        id: `DB-${record.id}`,
        no: 0,
        previewUrl: record.annotated_image ? `data:image/jpeg;base64,${record.annotated_image}` : "",
        fileName: record.filename,
        fruitName: record.fruit_type,
        label: record.predicted_label,
        manualLabel: record.manual_label,
        classConf: record.confidence,
        yoloClass: record.fruit_type,
        status: record.is_rejected ? "rejected" : "completed",
        dbId: record.id,
        createdAt: record.created_at,
        detectionIndex: 0,
        parentImageId: `DB-${record.id}`,
        _result: apiResponse,
      } as BatchItem & { _result: ApiResponse }];
    }

    setItems((prev) => {
      const existingIdx = prev.findIndex((i) => i.dbId === record.id);
      if (existingIdx !== -1) {
        setActiveIndex(existingIdx);
        return prev;
      }
      const updated = [...prev, ...newItemsToLoad].map((it, idx) => ({ ...it, no: idx + 1 }));
      setActiveIndex(updated.length - newItemsToLoad.length);
      return updated;
    });
};

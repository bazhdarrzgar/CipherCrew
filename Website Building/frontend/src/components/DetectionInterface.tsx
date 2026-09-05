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

  // ── Remove Item / Remove Detected Fruit ──
  const handleRemoveItem = useCallback((index: number) => {
    setItems((prev) => {
      const targetItem = prev[index];
      if (!targetItem) return prev;

      const targetParentId = targetItem.parentImageId || targetItem.id;
      const targetDetIdx = targetItem.detectionIndex;

      // Remove the target item from list
      const remaining = prev.filter((_, i) => i !== index);

      // If target was part of a multi-fruit detection, update sibling items and their _result
      const updated = remaining.map((it) => {
        const itParent = it.parentImageId || it.id;
        if (itParent === targetParentId && targetDetIdx !== undefined && it.detectionIndex !== undefined) {
          const currentResult = (it as BatchItem & { _result?: ApiResponse })._result;
          let newResult = currentResult;
          if (currentResult?.detections) {
            const newDets = currentResult.detections.filter((_, dI) => dI !== targetDetIdx);
            newResult = {
              ...currentResult,
              detections: newDets,
              total: newDets.length,
            };
          }
          const newDetIdx = it.detectionIndex > targetDetIdx ? it.detectionIndex - 1 : it.detectionIndex;
          return {
            ...it,
            detectionIndex: newDetIdx,
            ...(newResult ? { _result: newResult } : {}),
          };
        }
        return it;
      });

      return updated.map((it, idx) => ({ ...it, no: idx + 1 }));
    });

    setActiveIndex((prev) => {
      if (items.length <= 1) return 0;
      if (prev >= index && prev > 0) return prev - 1;
      return prev;
    });
  }, [items.length]);

  const handleRemoveDetection = useCallback((detIndex: number) => {
    if (!activeItem) return;
    const targetParentId = activeItem.parentImageId || activeItem.id;

    // Find the item corresponding to this detection in the items list
    const itemIndex = items.findIndex(
      (it) => (it.parentImageId || it.id) === targetParentId && it.detectionIndex === detIndex
    );

    if (itemIndex !== -1) {
      handleRemoveItem(itemIndex);
    } else {
      handleRemoveItem(activeIndex);
    }
  }, [activeItem, activeIndex, items, handleRemoveItem]);

  const handleClearAll = () => {
    items.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    setItems([]);
    setActiveIndex(0);
    _idCounter = 0;
  };

  const pendingCount = items.filter((i) => i.status === "pending").length;
  const processingItem = items.find((i) => i.status === "processing");
  const processingIdx = items.findIndex((i) => i.status === "processing");
  const completedCount = items.filter((i) => i.status === "completed" || i.status === "rejected").length;
  const totalCount = items.length;

  const canNavigatePrev = activeIndex > 0;
  const canNavigateNext = activeIndex < items.length - 1;

  // ─── Empty State: Upload Drop Zone ────────────────────────────────────────
  if (items.length === 0) {
    return (
      <div className="w-full flex flex-col items-center px-2">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`w-full max-w-2xl border-2 border-dashed rounded-2xl sm:rounded-3xl p-6 sm:p-10 md:p-12 flex flex-col items-center justify-center cursor-pointer transition-all backdrop-blur-3xl shadow-xl ${
            isDragging
              ? "border-black/40 bg-black/5 dark:border-white/40 dark:bg-white/5 scale-[1.01]"
              : "border-white/60 bg-white/20 dark:border-zinc-800 dark:bg-zinc-900/40 hover:bg-white/30 dark:hover:bg-zinc-900/60"
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*,.jfif,.avif,.heic,.heif,.webp"
            multiple
            className="hidden"
          />
          <div className="bg-white/40 dark:bg-zinc-800/80 backdrop-blur-xl border border-white/60 dark:border-zinc-700/80 p-4 sm:p-6 rounded-full mb-4 sm:mb-6 shadow-inner">
            <Images className="w-8 h-8 sm:w-12 sm:h-12 text-black/70 dark:text-zinc-200" />
          </div>
          <h3 className="text-xl sm:text-2xl font-bold mb-1.5 sm:mb-2 font-instrument tracking-tight text-black dark:text-white text-center">
            Upload Fruit Images
          </h3>
          <p className="text-black/60 dark:text-zinc-400 text-xs sm:text-sm font-medium text-center max-w-sm px-2">
            Drag & drop, click to select images, or capture live using your device camera.
          </p>
        </motion.div>

        {/* Action Buttons in Empty State */}
        <div className="flex flex-col sm:flex-row items-center gap-2.5 sm:gap-3 mt-6 w-full max-w-md sm:max-w-none sm:w-auto justify-center">
          <button
            onClick={() => setIsCameraOpen(true)}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl sm:rounded-2xl text-sm font-bold shadow-md shadow-emerald-950/20 transition-all hover:scale-105 active:scale-95"
          >
            <Camera className="w-4 h-4" />
            <span>Open Camera</span>
          </button>
          <button
            onClick={() => setIsHistoryOpen(true)}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 bg-white/60 hover:bg-white dark:bg-zinc-800/80 dark:hover:bg-zinc-700/80 backdrop-blur-xl border border-white/60 dark:border-zinc-700 rounded-xl sm:rounded-2xl text-xs font-bold text-black dark:text-white shadow-sm transition-all hover:scale-105 active:scale-95"
          >
            <Database className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>View Database History</span>
            {dbCount !== null && dbCount > 0 && (
              <span className="px-2 py-0.5 text-[10px] bg-black text-white dark:bg-white dark:text-black rounded-full font-mono font-semibold">
                {dbCount}
              </span>
            )}
          </button>
        </div>

        {globalError && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-2xl mt-6 bg-red-50/80 dark:bg-red-950/40 backdrop-blur-xl border border-red-200 dark:border-red-900/60 p-4 rounded-2xl text-center"
          >
            <p className="text-red-600 dark:text-red-300 text-sm">{globalError}</p>
          </motion.div>
        )}

        <HistoryModal
          isOpen={isHistoryOpen}
          onClose={() => setIsHistoryOpen(false)}
          onLoadRecord={handleLoadHistoryRecord}
        />

        <CameraModal
          isOpen={isCameraOpen}
          onClose={() => setIsCameraOpen(false)}
          onCapture={(file) => {
            addFiles([file]);
            setIsCameraOpen(false);
          }}
        />
      </div>
    );
  }

  // ─── Queue + Results View ──────────────────────────────────────────────────
  return (
    <div className="w-full flex flex-col gap-4 sm:gap-6">

      {/* ── Queue Progress Bar (shown while processing) ── */}
      <AnimatePresence>
        {(isQueueRunning || pendingCount > 0) && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="w-full bg-white/50 dark:bg-zinc-900/80 backdrop-blur-2xl border border-white/60 dark:border-zinc-800 rounded-xl sm:rounded-2xl px-4 sm:px-6 py-3 sm:py-4 flex items-center gap-3 sm:gap-4 shadow-lg"
          >
            <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 text-black/60 dark:text-zinc-300 animate-spin shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-semibold text-black/80 dark:text-zinc-200 font-instrument truncate">
                {isQueueRunning
                  ? `Processing ${processingIdx + 1} of ${totalCount}: ${processingItem?.fileName ?? "..."}`
                  : `${pendingCount} image${pendingCount > 1 ? "s" : ""} queued…`}
              </p>
              <div className="mt-1.5 sm:mt-2 bg-black/10 dark:bg-white/10 rounded-full h-1.5 overflow-hidden">
                <motion.div
                  animate={{ width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%` }}
                  transition={{ duration: 0.5 }}
                  className="h-full bg-black dark:bg-white rounded-full"
                />
              </div>
            </div>
            <span className="text-[11px] sm:text-xs text-black/50 dark:text-zinc-400 font-mono shrink-0">{completedCount}/{totalCount}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Header Row: Add More / Camera / Database History / Clear All ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-2.5 bg-white/60 hover:bg-white dark:bg-zinc-800/80 dark:hover:bg-zinc-700/80 backdrop-blur-xl border border-white/60 dark:border-zinc-700 rounded-xl text-xs sm:text-sm font-bold text-black dark:text-white shadow-sm transition-all hover:scale-105 active:scale-95"
          >
            <UploadCloud className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>Add Images</span>
          </button>
          <button
            onClick={() => setIsCameraOpen(true)}
            className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs sm:text-sm font-bold shadow-sm transition-all hover:scale-105 active:scale-95"
          >
            <Camera className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>Camera</span>
          </button>
          <button
            onClick={() => setIsHistoryOpen(true)}
            className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-white/60 hover:bg-white dark:bg-zinc-800/80 dark:hover:bg-zinc-700/80 backdrop-blur-xl border border-white/60 dark:border-zinc-700 rounded-xl text-xs sm:text-sm font-bold text-black dark:text-white shadow-sm transition-all hover:scale-105 active:scale-95"
          >
            <Database className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Database</span>
            {dbCount !== null && dbCount > 0 && (
              <span className="px-1.5 py-0.5 text-[9px] sm:text-[10px] bg-black text-white dark:bg-white dark:text-black rounded-full font-mono">
                {dbCount}
              </span>
            )}
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*,.jfif,.avif,.heic,.heif,.webp"
            multiple
            className="hidden"
          />
        </div>
        <button
          onClick={handleClearAll}
          className="self-end sm:self-auto flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-all"
        >
          <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span>Clear All</span>
        </button>
      </div>

      {/* ── Thumbnail Strip ── */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin touch-pan-x -mx-1 px-1">
        {items.map((item, idx) => (
          <button
            key={item.id}
            onClick={() => item.status !== "pending" && setActiveIndex(idx)}
            title={item.fileName}
            className={`relative shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-xl overflow-hidden border-2 transition-all ${
              idx === activeIndex
                ? "border-black dark:border-white scale-105 shadow-lg"
                : "border-transparent opacity-70 hover:opacity-100 hover:border-black/30 dark:hover:border-white/40"
            } ${item.status === "pending" ? "cursor-not-allowed" : ""}`}
          >
            <img src={item.previewUrl} alt={item.fileName} className="w-full h-full object-cover" />
            {item.status === "processing" && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 text-white animate-spin" />
              </div>
            )}
            {item.status === "rejected" && (
              <div className="absolute inset-0 bg-red-500/30" />
            )}
          </button>
        ))}
      </div>

      {/* ── Active Result Viewer ── */}
      <AnimatePresence mode="wait">
        {activeItem && (
          <motion.div
            key={activeItem.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.3 }}
          >
            {activeItem.status === "processing" && (
              <ProcessingView preview={activeItem.previewUrl} fileName={activeItem.fileName} />
            )}

            {activeItem.status === "pending" && (
              <div className="w-full bg-white/30 dark:bg-zinc-900/50 backdrop-blur-2xl border border-white/60 dark:border-zinc-800 rounded-3xl p-12 flex flex-col items-center justify-center gap-3 text-black/50 dark:text-zinc-400">
                <Clock className="w-10 h-10" />
                <p className="font-instrument text-lg">Queued — waiting for turn</p>
                <p className="text-sm">{activeItem.fileName}</p>
              </div>
            )}

            {activeItem.status === "failed" && (
              <div className="w-full bg-red-50/80 dark:bg-red-950/40 backdrop-blur-xl border border-red-200 dark:border-red-900/60 rounded-3xl p-10 flex flex-col items-center gap-3 text-center">
                <p className="text-red-700 dark:text-red-300 font-bold font-instrument text-2xl">Analysis Failed</p>
                <p className="text-red-600 dark:text-red-400 text-sm">{activeItem.error}</p>
              </div>
            )}

            {(activeItem.status === "completed" || activeItem.status === "rejected") && activeResult && (
              <ResultView
                result={activeResult}
                activeItem={activeItem}
                isRejected={activeItem.status === "rejected"}
                onReject={() => handleRejectItem(activeIndex)}
                onRestore={() => handleRestoreItem(activeIndex)}
                onRemoveDetection={handleRemoveDetection}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Prev / Next Navigation ── */}
      {items.length > 1 && (
        <div className="flex justify-center items-center gap-4">
          <button
            onClick={() => setActiveIndex((i) => Math.max(0, i - 1))}
            disabled={!canNavigatePrev}
            className="p-2 rounded-xl bg-white/60 hover:bg-white dark:bg-zinc-800/80 dark:hover:bg-zinc-700/80 border border-white/60 dark:border-zinc-700 text-black dark:text-white shadow-sm disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-sm text-black/60 dark:text-zinc-400 font-mono">
            {activeIndex + 1} / {items.length}
          </span>
          <button
            onClick={() => setActiveIndex((i) => Math.min(items.length - 1, i + 1))}
            disabled={!canNavigateNext}
            className="p-2 rounded-xl bg-white/60 hover:bg-white dark:bg-zinc-800/80 dark:hover:bg-zinc-700/80 border border-white/60 dark:border-zinc-700 text-black dark:text-white shadow-sm disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* ── Batch Results Table ── */}
      <BatchTable
        items={items}
        activeIndex={activeIndex}
        onSelectItem={setActiveIndex}
        onOverrideLabel={handleOverrideLabel}
        onRejectItem={handleRejectItem}
        onRestoreItem={handleRestoreItem}
        onRemoveItem={handleRemoveItem}
      />

      <HistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        onLoadRecord={handleLoadHistoryRecord}
      />

      <CameraModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapture={(file) => {
          addFiles([file]);
          setIsCameraOpen(false);
        }}
      />
    </div>
  );
};

// ─── Clock Icon (inline for pending state) ────────────────────────────────────

const Clock = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <circle cx="12" cy="12" r="9" />
    <path strokeLinecap="round" d="M12 7v5l3 3" />
  </svg>
);

// ─── Processing View ──────────────────────────────────────────────────────────

const ProcessingView = ({ preview, fileName }: { preview: string; fileName: string }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    className="flex flex-col items-center justify-center gap-6 py-12 w-full bg-white/50 dark:bg-zinc-900/70 backdrop-blur-3xl rounded-3xl border border-white/40 dark:border-zinc-800 shadow-2xl p-8"
  >
    <div className="relative overflow-hidden rounded-xl bg-black/5 dark:bg-black/40 w-full max-w-xs aspect-square flex items-center justify-center shadow-inner">
      {preview && <img src={preview} alt={fileName} className="absolute inset-0 w-full h-full object-cover opacity-80" />}
      <motion.div
        initial={{ top: "-10%" }}
        animate={{ top: "110%" }}
        transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
        className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#5ec522] to-transparent shadow-[0_0_20px_#5ec522] z-10"
      />
    </div>
    <div className="flex flex-col items-center text-center">
      <p className="text-2xl font-bold animate-pulse text-black dark:text-white font-instrument tracking-tight">Extracting Fruit Features…</p>
      <p className="text-sm text-gray-500 dark:text-zinc-400 font-inter mt-1">Running YOLOv8 & MobileNet Deep Classification</p>
      <p className="text-xs text-gray-400 dark:text-zinc-500 mt-2 truncate max-w-xs">{fileName}</p>
    </div>
  </motion.div>
);

// ─── Result View ──────────────────────────────────────────────────────────────

const ResultView = ({
  result,
  activeItem,
  isRejected,
  onReject,
  onRestore,
  onRemoveDetection,
}: {
  result: ApiResponse;
  activeItem?: BatchItem | null;
  isRejected: boolean;
  onReject: () => void;
  onRestore: () => void;
  onRemoveDetection: (detIndex: number) => void;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    animate={{ opacity: 1, y: 0 }}
    className={`w-full flex flex-col gap-8 sm:gap-12 ${isRejected ? "opacity-60 pointer-events-none" : ""}`}
  >
    <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start w-full">
      {/* Main Annotated Image */}
      <div className="flex-[3] w-full flex flex-col gap-4">
        <div className="bg-white/30 dark:bg-zinc-900/60 backdrop-blur-3xl p-2.5 sm:p-3 rounded-2xl sm:rounded-3xl shadow-[0_12px_40px_rgb(0,0,0,0.08)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.5)] border border-white/60 dark:border-zinc-800">
          <div className="flex items-center justify-between px-2 mb-2.5 sm:mb-3">
            <h2 className="text-lg sm:text-xl font-bold font-instrument text-black/80 dark:text-zinc-200">Analysis Result</h2>
            {isRejected ? (
              <button onClick={onRestore} className="text-xs text-emerald-600 dark:text-emerald-400 font-bold hover:underline">Restore</button>
            ) : (
              <button onClick={onReject} className="text-xs text-red-400 dark:text-red-400 font-bold hover:underline">Reject Result</button>
            )}
          </div>
          <div className="relative w-full rounded-xl sm:rounded-2xl overflow-hidden bg-black/5 dark:bg-black/40">
            <img
              src={`data:image/jpeg;base64,${result.annotated_image}`}
              className="w-full h-auto block"
              alt="Analyzed fruit result"
            />
          </div>
          {result.used_fallback && (
            <p className="px-2 pt-2.5 sm:pt-3 text-xs text-black/50 dark:text-zinc-400">
              The detector did not isolate a fruit box, so the classifier analyzed the full uploaded image.
            </p>
          )}
        </div>
      </div>

      {/* Detections List */}
      <div className="flex-[2] w-full flex flex-col gap-4 sm:gap-6">
        {result.overall && (
          <div className="bg-white/40 dark:bg-zinc-900/70 backdrop-blur-2xl border border-white/60 dark:border-zinc-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xl shadow-black/5 dark:shadow-black/30">
            <p className="text-[10px] sm:text-xs uppercase font-bold tracking-widest text-black/50 dark:text-zinc-400 mb-1 sm:mb-2">Overall Result</p>
            <h2 className="text-3xl sm:text-4xl font-bold font-instrument text-black/90 dark:text-zinc-100">
              {result.overall.label.toLowerCase() === "fresh" ? "Good" :
               result.overall.label.toLowerCase() === "rotten" ? "Bad" :
               result.overall.label.toLowerCase() === "adulterant" || result.overall.label.toLowerCase() === "adulterated" ? "Unknown" :
};

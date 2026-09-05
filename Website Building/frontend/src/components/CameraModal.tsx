"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Camera, X, RefreshCw, Check, RotateCcw, VideoOff, Zap, Sparkles 
} from "lucide-react";

interface CameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (file: File) => void;
}

export const CameraModal = ({ isOpen, onClose, onCapture }: CameraModalProps) => {
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFlashing, setIsFlashing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const capturedBlobRef = useRef<Blob | null>(null);
  const nativeCameraInputRef = useRef<HTMLInputElement | null>(null);

  // Stop camera tracks safely
  const stopStream = useCallback(() => {
    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach((track) => track.stop());
      } catch (e) {
        console.error("Error stopping tracks:", e);
      }
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  // Initialize camera stream
  const startCamera = useCallback(async (mode: "environment" | "user") => {
    stopStream();
    setCameraError(null);
    setIsLoading(true);

    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setCameraError("Camera access is not supported by your browser or requires HTTPS.");
      setIsLoading(false);
      return;
    }

    try {
      // Check available video inputs
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter((d) => d.kind === "videoinput");
        setHasMultipleCameras(videoDevices.length > 1);
      } catch {
        setHasMultipleCameras(true);
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch((err) => console.warn("Video play error:", err));
          setIsLoading(false);
        };
      } else {
        setIsLoading(false);
      }
    } catch (err: unknown) {
      setIsLoading(false);
      const error = err as Error;
      if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
        setCameraError("Camera permission was denied. Please allow camera permissions in your browser.");
      } else if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
        setCameraError("No camera device found on this system.");
      } else {
        setCameraError("Could not access camera: " + (error.message || "Unknown error"));
      }
    }
  }, [stopStream]);

  // Lifecycle: ONLY respond to isOpen and facingMode
  useEffect(() => {
    if (isOpen) {
      capturedBlobRef.current = null;
      setCapturedBlob(null);
      setPreviewUrl(null);
      setIsSubmitting(false);
      startCamera(facingMode);
    } else {
      stopStream();
      capturedBlobRef.current = null;
      setCapturedBlob(null);
      setPreviewUrl(null);
      setCameraError(null);
      setIsSubmitting(false);
    }

    return () => {
      stopStream();
    };
  }, [isOpen, facingMode, startCamera, stopStream]);

  // Toggle camera between front and back
  const handleToggleCamera = () => {
    const nextMode = facingMode === "environment" ? "user" : "environment";
    setFacingMode(nextMode);
  };

  // Helper to package and send file to parent callback
  const submitFile = useCallback((blob: Blob) => {
    setIsSubmitting(true);
    const timestamp = Date.now();
    const file = new File([blob], `camera_${timestamp}.jpg`, {
      type: "image/jpeg",
      lastModified: timestamp,
    });
    stopStream();
    onCapture(file);
    onClose();
  }, [onCapture, onClose, stopStream]);

  // Take photo from current video frame
  const handleSnap = (autoSubmit: boolean = false) => {
    if (!videoRef.current) return;
    const video = videoRef.current;

    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Flash animation
    setIsFlashing(true);
    setTimeout(() => setIsFlashing(false), 180);

    // If front camera, mirror image to match preview
    if (facingMode === "user") {
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, width, height);

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          console.error("Canvas toBlob failed");
          return;
        }

        capturedBlobRef.current = blob;
        setCapturedBlob(blob);

        if (autoSubmit) {
          submitFile(blob);
        } else {
          const url = URL.createObjectURL(blob);
          setPreviewUrl(url);
          stopStream();
        }
      },
      "image/jpeg",
      0.95
    );
  };

  // Retake photo
  const handleRetake = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    capturedBlobRef.current = null;
    setCapturedBlob(null);
    startCamera(facingMode);
  };

  // Confirm photo from preview and send for processing
  const handleConfirm = () => {
    const blob = capturedBlobRef.current || capturedBlob;
    if (!blob) {
      console.error("No captured blob available to submit");
      return;
    }
    submitFile(blob);
  };

  // Native camera file input change
  const handleNativeCameraChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      stopStream();
      onCapture(file);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 md:p-8 bg-black/80 backdrop-blur-md overflow-hidden">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="relative w-full max-w-2xl max-h-[85vh] flex flex-col min-h-0 mx-auto bg-zinc-950 border border-zinc-800 rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl my-auto"
        >
          {/* Hidden native camera capture input as hardware backup */}
          <input
            type="file"
            ref={nativeCameraInputRef}
            accept="image/*"
            capture="environment"
            onChange={handleNativeCameraChange}
            className="hidden"
          />

          {/* Header */}
          <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-zinc-800/80 bg-zinc-900/50 shrink-0">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                <Camera className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-semibold text-white font-instrument tracking-tight">
                  {previewUrl ? "Review Produce Photo" : "Capture Produce Image"}
                </h3>
                <p className="text-[11px] sm:text-xs text-zinc-400 font-inter">
                  {previewUrl ? "Confirm photo or retake for grading" : "Position fruit inside frame and capture"}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 sm:p-2 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              title="Close camera"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>

          {/* Viewfinder / Camera Screen */}
          <div className="relative w-full aspect-[4/3] sm:aspect-[16/10] max-h-[50vh] sm:max-h-[60vh] bg-black flex items-center justify-center overflow-hidden">
            {/* Shutter flash */}
            {isFlashing && (
              <div className="absolute inset-0 z-40 bg-white opacity-80 transition-opacity duration-150 pointer-events-none" />
            )}

            {/* Error Display */}
            {cameraError ? (
              <div className="flex flex-col items-center justify-center p-6 sm:p-8 text-center max-w-md">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 mb-3 sm:mb-4">
                  <VideoOff className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <h4 className="text-white font-medium mb-1.5 sm:mb-2 font-instrument text-base sm:text-lg">Camera Unavailable</h4>
                <p className="text-xs text-zinc-400 leading-relaxed mb-4 sm:mb-6 font-inter">{cameraError}</p>
                <div className="flex gap-2 sm:gap-3 flex-wrap justify-center">
                  <button
                    onClick={() => startCamera(facingMode)}
                    className="flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-semibold transition-all border border-zinc-700"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Retry
                  </button>
                  <button
                    onClick={() => nativeCameraInputRef.current?.click()}
                    className="flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition-all shadow-md shadow-emerald-950/40"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    Open Native Camera
                  </button>
                </div>
              </div>
            ) : previewUrl ? (
              /* Image Preview mode */
              <div className="relative w-full h-full flex items-center justify-center bg-black">
                <img
                  src={previewUrl}
                  alt="Captured fruit produce"
                  className="w-full h-full object-contain"
                />
                <div className="absolute bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 pointer-events-none px-3 py-1 rounded-full bg-black/70 backdrop-blur-md border border-white/20 text-[11px] sm:text-xs text-emerald-400 font-inter font-medium flex items-center gap-1.5 shadow-lg">
                  <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  <span>Photo ready for grading</span>
                </div>
              </div>
            ) : (
              /* Live Camera Stream */
              <div className="relative w-full h-full flex items-center justify-center">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${
                    facingMode === "user" ? "scale-x-[-1]" : ""
                  }`}
                />

                {/* Viewfinder Overlay Reticle */}
                <div className="absolute inset-6 sm:inset-12 pointer-events-none flex flex-col justify-between">
                  <div className="flex justify-between">
                    <div className="w-6 h-6 sm:w-8 sm:h-8 border-t-2 border-l-2 border-emerald-400/80 rounded-tl-lg shadow-sm" />
                    <div className="w-6 h-6 sm:w-8 sm:h-8 border-t-2 border-r-2 border-emerald-400/80 rounded-tr-lg shadow-sm" />
                  </div>
                  <div className="flex justify-between">
                    <div className="w-6 h-6 sm:w-8 sm:h-8 border-b-2 border-l-2 border-emerald-400/80 rounded-bl-lg shadow-sm" />
                    <div className="w-6 h-6 sm:w-8 sm:h-8 border-b-2 border-r-2 border-emerald-400/80 rounded-br-lg shadow-sm" />
                  </div>
                </div>

                {/* Framing Guidance */}
                <div className="absolute top-3 sm:top-4 left-1/2 -translate-x-1/2 pointer-events-none px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[10px] sm:text-[11px] text-zinc-300 font-inter font-medium tracking-wide whitespace-nowrap">
                  Align produce inside visual frame
                </div>

                {isLoading && (
                  <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-3">
                    <RefreshCw className="w-6 h-6 text-emerald-400 animate-spin" />
                    <span className="text-xs text-zinc-300 font-inter">Starting camera stream…</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Controls Bar */}
          <div className="px-4 sm:px-6 py-3 sm:py-5 border-t border-zinc-800/80 bg-zinc-900/80 backdrop-blur-xl flex items-center justify-between gap-2 sm:gap-4 shrink-0">
            {previewUrl ? (
              /* Action buttons when photo is captured */
              <div className="w-full flex items-center justify-between gap-3 sm:gap-4">
                <button
                  onClick={handleRetake}
                  disabled={isSubmitting}
                  className="flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-2.5 sm:py-3 px-3 sm:px-4 rounded-xl sm:rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs sm:text-sm font-medium transition-all active:scale-95 border border-zinc-700 disabled:opacity-50"
                >
                  <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span>Retake</span>
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={isSubmitting}
                  className="flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-2.5 sm:py-3 px-3 sm:px-4 rounded-xl sm:rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-bold transition-all active:scale-95 shadow-lg shadow-emerald-950/40 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
                      <span>Queueing…</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
                      <span>Grade Produce</span>
                    </>
                  )}
                </button>
              </div>
            ) : (
              /* Live capture buttons */
              <div className="w-full flex items-center justify-between gap-2">
                {/* Switch camera button */}
                <div className="w-16 sm:w-24 flex justify-start">
                  {hasMultipleCameras && !cameraError && (
                    <button
                      onClick={handleToggleCamera}
                      title="Switch Camera (Front/Rear)"
                      className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700 text-xs font-medium transition-all active:scale-95"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Flip</span>
                    </button>
                  )}
                </div>

                {/* Shutter Button & Instant Capture */}
                {!cameraError && (
                  <div className="flex items-center gap-2.5 sm:gap-4">
                    {/* Primary Shutter Button */}
                    <button
                      onClick={() => handleSnap(false)}
                      disabled={isLoading}
                      title="Take Produce Photo"
                      className="group relative flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-full border-4 border-white/80 hover:border-white transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-black/60 shrink-0"
                    >
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white group-hover:scale-105 transition-transform" />
                    </button>

                    {/* Instant Snap & Grade Button */}
                    <button
                      onClick={() => handleSnap(true)}
                      disabled={isLoading}
                      title="Snap & Grade Instantly"
                      className="flex items-center gap-1 sm:gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl bg-emerald-600/90 hover:bg-emerald-500 text-white text-[11px] sm:text-xs font-bold transition-all shadow-md shadow-emerald-950/30 active:scale-95 border border-emerald-400/30 whitespace-nowrap"
                    >
                      <Zap className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-300 fill-amber-300" />
                      <span>Instant Grade</span>
                    </button>
                  </div>
                )}

                {/* Device native camera trigger */}
                <div className="w-16 sm:w-24 flex justify-end">
                  <button
                    onClick={() => nativeCameraInputRef.current?.click()}
                    title="Open device camera app"
                    className="p-2 sm:p-2.5 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-white border border-zinc-700 transition-all text-xs"
                  >
                    <Camera className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

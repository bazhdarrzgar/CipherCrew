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
};

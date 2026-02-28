"use client";

import { useState, useRef, useCallback, useEffect } from "react";

type FaceColor = "W" | "Y" | "R" | "O" | "B" | "G";
type FaceName = "U" | "D" | "R" | "L" | "F" | "B";

const ALL_COLORS: FaceColor[] = ["W", "Y", "R", "O", "B", "G"];

const COLOR_HEX: Record<string, string> = {
  W: "#f5f5f5",
  Y: "#fdd835",
  R: "#d32f2f",
  O: "#fb8c00",
  B: "#1565c0",
  G: "#2e7d32",
};

const COLOR_LABEL: Record<string, string> = {
  W: "White",
  Y: "Yellow",
  R: "Red",
  O: "Orange",
  B: "Blue",
  G: "Green",
};

const FACE_ORDER: {
  face: FaceName;
  label: string;
  action: string;
  scan: string;
  top: string;
  bottom: string;
  left: string;
  right: string;
}[] = [
  {
    face: "F",
    label: "Front",
    action: "Start: White on top, Green facing camera",
    scan: "G",
    top: "W",
    bottom: "Y",
    left: "O",
    right: "R",
  },
  {
    face: "R",
    label: "Right",
    action: "Rotate cube LEFT once",
    scan: "R",
    top: "W",
    bottom: "Y",
    left: "G",
    right: "B",
  },
  {
    face: "B",
    label: "Back",
    action: "Rotate cube LEFT again",
    scan: "B",
    top: "W",
    bottom: "Y",
    left: "R",
    right: "O",
  },
  {
    face: "L",
    label: "Left",
    action: "Rotate cube LEFT again",
    scan: "O",
    top: "W",
    bottom: "Y",
    left: "B",
    right: "G",
  },
  {
    face: "U",
    label: "Top",
    action: "Tilt cube FORWARD",
    scan: "W",
    top: "B",
    bottom: "G",
    left: "O",
    right: "R",
  },
  {
    face: "D",
    label: "Bottom",
    action: "Tilt cube BACKWARD",
    scan: "Y",
    top: "G",
    bottom: "B",
    left: "O",
    right: "R",
  },
];

function ColorChip({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div
        className="w-5 h-5 rounded border border-white/20 shrink-0"
        style={{ backgroundColor: COLOR_HEX[color] }}
      />
      <span className="text-white/60 text-xs">{label}</span>
    </div>
  );
}

function OrientationTable({ step }: { step: (typeof FACE_ORDER)[0] }) {
  return (
    <div className="w-full">
      <p className="text-indigo-300 text-sm font-medium mb-3">{step.action}</p>

      <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08]">
        <div
          className="w-8 h-8 rounded-lg border-2 border-white/30 shrink-0"
          style={{ backgroundColor: COLOR_HEX[step.scan] }}
        />
        <div>
          <span className="text-white text-sm font-semibold">
            {COLOR_LABEL[step.scan]}
          </span>
          <span className="text-white/40 text-sm ml-1.5">facing camera</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 px-1">
        <ColorChip color={step.top} label={`${COLOR_LABEL[step.top]} on top`} />
        <ColorChip
          color={step.bottom}
          label={`${COLOR_LABEL[step.bottom]} on bottom`}
        />
        <ColorChip
          color={step.left}
          label={`${COLOR_LABEL[step.left]} on left`}
        />
        <ColorChip
          color={step.right}
          label={`${COLOR_LABEL[step.right]} on right`}
        />
      </div>
    </div>
  );
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0,
    s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
        break;
      case g:
        h = ((b - r) / d + 2) * 60;
        break;
      case b:
        h = ((r - g) / d + 4) * 60;
        break;
    }
  }
  return [h, s, l];
}

function classifyColor(r: number, g: number, b: number): FaceColor {
  const [h, s, l] = rgbToHsl(r, g, b);
  if (s < 0.2 && l > 0.65) return "W";
  if (h >= 35 && h <= 70 && s > 0.3) return "Y";
  if (h >= 10 && h < 35 && s > 0.3) return "O";
  if ((h < 10 || h > 340) && s > 0.3) return "R";
  if (h >= 90 && h <= 170 && s > 0.2) return "G";
  if (h >= 190 && h <= 260 && s > 0.2) return "B";
  if (l > 0.6) return "W";
  if (h < 30) return "R";
  if (h < 70) return "Y";
  if (h < 160) return "G";
  if (h < 260) return "B";
  return "R";
}

export default function CameraScanner({
  isOpen,
  onClose,
  onComplete,
}: {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (faces: Record<FaceName, FaceColor[]>) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [currentFaceIndex, setCurrentFaceIndex] = useState(0);
  const [scannedFaces, setScannedFaces] = useState<Record<string, FaceColor[]>>(
    {},
  );
  const [capturedColors, setCapturedColors] = useState<FaceColor[] | null>(
    null,
  );
  const [isStreaming, setIsStreaming] = useState(false);
  const [selectedTile, setSelectedTile] = useState<number | null>(null);
  const [mode, setMode] = useState<"camera" | "manual">("camera");

  const currentFace = FACE_ORDER[currentFaceIndex];

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: 640, height: 480 },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsStreaming(true);
      }
    } catch {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480 },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          streamRef.current = stream;
          setIsStreaming(true);
        }
      } catch (err) {
        console.error("Camera access denied:", err);
      }
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      setIsStreaming(false);
    }
  }, []);

  // Start camera only in camera mode
  useEffect(() => {
    if (isOpen) {
      setCurrentFaceIndex(0);
      setScannedFaces({});
      setCapturedColors(null);
      setSelectedTile(null);
      if (mode === "camera") {
        startCamera();
      }
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [isOpen]);

  // Handle mode switch
  useEffect(() => {
    if (!isOpen) return;
    if (mode === "camera" && !isStreaming) {
      startCamera();
    } else if (mode === "manual") {
      stopCamera();
      // Pre-fill with gray/center color if no capture yet
      if (!capturedColors) {
        const center = currentFace.scan as FaceColor;
        setCapturedColors(Array(9).fill(center));
      }
    }
  }, [mode]);

  const captureFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const gridSize = Math.min(canvas.width, canvas.height) * 0.5;
    const cellSize = gridSize / 3;
    const sampleSize = cellSize * 0.4;

    const colors: FaceColor[] = [];

    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        const x = centerX - gridSize / 2 + col * cellSize + cellSize / 2;
        const y = centerY - gridSize / 2 + row * cellSize + cellSize / 2;
        const sx = Math.round(x - sampleSize / 2);
        const sy = Math.round(y - sampleSize / 2);
        const sw = Math.round(sampleSize);
        const sh = Math.round(sampleSize);

        const imageData = ctx.getImageData(sx, sy, sw, sh);
        let totalR = 0,
          totalG = 0,
          totalB = 0;
        const pixels = imageData.data.length / 4;

        for (let i = 0; i < imageData.data.length; i += 4) {
          totalR += imageData.data[i];
          totalG += imageData.data[i + 1];
          totalB += imageData.data[i + 2];
        }

        colors.push(
          classifyColor(totalR / pixels, totalG / pixels, totalB / pixels),
        );
      }
    }

    setCapturedColors(colors);
    setSelectedTile(null);
  }, []);

  const handleColorPick = useCallback(
    (color: FaceColor) => {
      if (selectedTile === null || !capturedColors) return;
      const updated = [...capturedColors];
      updated[selectedTile] = color;
      setCapturedColors(updated);
      setSelectedTile(null);
    },
    [selectedTile, capturedColors],
  );

  const confirmFace = useCallback(() => {
    if (!capturedColors || !currentFace) return;
    const updated = { ...scannedFaces, [currentFace.face]: capturedColors };
    setScannedFaces(updated);
    setCapturedColors(null);
    setSelectedTile(null);

    if (currentFaceIndex < FACE_ORDER.length - 1) {
      const nextIndex = currentFaceIndex + 1;
      setCurrentFaceIndex(nextIndex);
      // In manual mode, pre-fill next face with center color
      if (mode === "manual") {
        const nextCenter = FACE_ORDER[nextIndex].scan as FaceColor;
        setCapturedColors(Array(9).fill(nextCenter));
      }
    } else {
      stopCamera();
      onComplete(updated as Record<FaceName, FaceColor[]>);
    }
  }, [
    capturedColors,
    currentFace,
    currentFaceIndex,
    scannedFaces,
    stopCamera,
    onComplete,
    mode,
  ]);

  const retryFace = useCallback(() => {
    setCapturedColors(null);
    setSelectedTile(null);
    // Restart camera if in camera mode
    if (mode === "camera" && !isStreaming) {
      startCamera();
    }
  }, [mode, isStreaming, startCamera]);

  const switchToManual = useCallback(() => {
    setMode("manual");
    stopCamera();
    if (!capturedColors) {
      const center = currentFace.scan as FaceColor;
      setCapturedColors(Array(9).fill(center));
    }
  }, [capturedColors, currentFace, stopCamera]);

  const switchToCamera = useCallback(() => {
    setMode("camera");
    setCapturedColors(null);
    setSelectedTile(null);
    startCamera();
  }, [startCamera]);

  if (!isOpen) return null;

  const showEditor = capturedColors !== null;
  const showVideo = mode === "camera" && !showEditor;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-[#0e0e18] rounded-3xl border border-white/[0.08] w-full max-w-3xl mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
          <div>
            <h2 className="text-white font-semibold text-lg">
              Scan Face {currentFaceIndex + 1}/6
            </h2>
            <p className="text-white/40 text-sm">{currentFace.label}</p>
          </div>

          <div className="flex items-center gap-2">
            {/* Mode toggle */}
            <div className="flex rounded-lg bg-white/[0.04] border border-white/[0.08] p-0.5">
              <button
                onClick={switchToCamera}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  mode === "camera"
                    ? "bg-indigo-500/20 text-indigo-300"
                    : "text-white/40 hover:text-white/60"
                }`}
              >
                Camera
              </button>
              <button
                onClick={switchToManual}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  mode === "manual"
                    ? "bg-indigo-500/20 text-indigo-300"
                    : "text-white/40 hover:text-white/60"
                }`}
              >
                Manual
              </button>
            </div>

            {/* Close */}
            <button
              onClick={() => {
                stopCamera();
                onClose();
              }}
              className="w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center text-white/50 hover:text-white hover:bg-white/[0.1] transition-all"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Main content */}
        <div className="flex">
          {/* Video / Editor area */}
          <div className="relative flex-1 bg-black min-h-[320px]">
            {/* Live video */}
            {showVideo && (
              <div className="relative w-full h-full min-h-[320px]">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                <canvas ref={canvasRef} className="hidden" />

                {/* Grid overlay */}
                {isStreaming && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div
                      className="border-2 border-white/30 rounded-lg"
                      style={{
                        width: "50%",
                        aspectRatio: "1",
                        display: "grid",
                        gridTemplateColumns: "repeat(3, 1fr)",
                        gridTemplateRows: "repeat(3, 1fr)",
                        gap: "2px",
                      }}
                    >
                      {Array(9)
                        .fill(0)
                        .map((_, i) => (
                          <div
                            key={i}
                            className="border border-white/20 rounded-sm"
                          />
                        ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Hidden video for camera mode when editing */}
            {mode === "camera" && showEditor && (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="hidden"
                />
                <canvas ref={canvasRef} className="hidden" />
              </>
            )}

            {/* Color editor (captured or manual) */}
            {showEditor && (
              <div className="w-full min-h-[320px] flex flex-col items-center justify-center bg-[#0e0e18] p-6">
                {/* 3x3 color grid */}
                <div className="grid grid-cols-3 gap-2.5">
                  {capturedColors!.map((color, i) => (
                    <button
                      key={i}
                      onClick={() =>
                        setSelectedTile(selectedTile === i ? null : i)
                      }
                      className={`w-16 h-16 rounded-xl border-2 flex items-center justify-center transition-all duration-150 cursor-pointer ${
                        selectedTile === i
                          ? "border-white scale-110 shadow-lg shadow-white/10"
                          : "border-white/10 hover:border-white/30 hover:scale-105"
                      }`}
                      style={{ backgroundColor: COLOR_HEX[color] }}
                    >
                      <span className="text-[11px] font-bold opacity-60 mix-blend-difference text-white">
                        {COLOR_LABEL[color][0]}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Color picker bar */}
                {selectedTile !== null ? (
                  <div className="mt-5 flex flex-col items-center gap-2">
                    <p className="text-white/40 text-xs">Pick color:</p>
                    <div className="flex gap-2">
                      {ALL_COLORS.map((c) => (
                        <button
                          key={c}
                          onClick={() => handleColorPick(c)}
                          className={`w-11 h-11 rounded-lg border-2 transition-all duration-150 hover:scale-110 active:scale-95 ${
                            capturedColors![selectedTile] === c
                              ? "border-white scale-105"
                              : "border-white/10 hover:border-white/40"
                          }`}
                          style={{ backgroundColor: COLOR_HEX[c] }}
                          title={COLOR_LABEL[c]}
                        >
                          <span className="text-[9px] font-bold opacity-60 mix-blend-difference text-white">
                            {COLOR_LABEL[c][0]}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-white/30 text-xs mt-5">
                    Tap a tile to change its color
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Orientation guide panel */}
          <div className="w-64 border-l border-white/[0.06] p-5 flex flex-col justify-between bg-[#0a0a14]">
            <OrientationTable step={currentFace} />

            {/* Progress */}
            <div className="mt-4 pt-4 border-t border-white/[0.06]">
              <div className="flex items-center justify-center gap-2">
                {FACE_ORDER.map((f, i) => (
                  <div
                    key={f.face}
                    className="flex flex-col items-center gap-1"
                  >
                    <div
                      className={`w-2.5 h-2.5 rounded-full transition-all ${
                        i < currentFaceIndex
                          ? "bg-indigo-500"
                          : i === currentFaceIndex
                            ? "bg-white"
                            : "bg-white/20"
                      }`}
                    />
                    <span className="text-[8px] text-white/30">{f.face}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 px-6 py-4 border-t border-white/[0.06]">
          {!showEditor ? (
            <button
              onClick={captureFrame}
              disabled={!isStreaming}
              className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium text-sm hover:shadow-lg hover:shadow-indigo-500/25 transition-all duration-300 disabled:opacity-40"
            >
              Capture
            </button>
          ) : (
            <>
              {mode === "camera" && (
                <button
                  onClick={retryFace}
                  className="flex-1 py-3 rounded-2xl bg-white/[0.06] border border-white/[0.1] text-white/70 font-medium text-sm hover:bg-white/[0.1] transition-all"
                >
                  Retake
                </button>
              )}
              <button
                onClick={confirmFace}
                className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium text-sm hover:shadow-lg hover:shadow-indigo-500/25 transition-all duration-300"
              >
                {currentFaceIndex < 5 ? "Next Face" : "Done"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

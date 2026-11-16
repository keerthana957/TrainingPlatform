import React, { useRef, useState } from 'react';
import {
  Crosshair,
  RotateCcw,
  Square,
  SlidersHorizontal,
  Trash2,
  ZoomIn,
  ZoomOut,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { AnnotationMarker } from '../types/radiology';

interface DicomAnnotatorCanvasProps {
  imageUrl: string;
  alt: string;
  mode: 'view' | 'spot' | 'annotate' | 'review';
  markers?: AnnotationMarker[];
  onAddMarker?: (marker: AnnotationMarker) => void;
  onRemoveMarker?: (id: string) => void;
  onClearMarkers?: () => void;
  spotTarget?: { x: number; y: number; radius: number };
  spotHit?: { x: number; y: number; matched: boolean } | null;
  onSpotAttempt?: (x: number, y: number, matched: boolean) => void;
  reviewOverlay?: {
    targetZone: { x: number; y: number; radius: number };
    traineeMarker: { x: number; y: number };
  };
  caption?: string;
}

export const DicomAnnotatorCanvas: React.FC<DicomAnnotatorCanvasProps> = ({
  imageUrl,
  alt,
  mode,
  markers = [],
  onAddMarker,
  onRemoveMarker,
  onClearMarkers,
  spotTarget,
  spotHit,
  onSpotAttempt,
  reviewOverlay,
  caption,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(105);
  const [zoom, setZoom] = useState(1);
  const [invert, setInvert] = useState(false);
  const [drawTool, setDrawTool] = useState<'pin' | 'box'>('box');
  const [pendingLabel, setPendingLabel] = useState('Primary Finding');
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragCurrent, setDragCurrent] = useState<{ x: number; y: number } | null>(null);
  const [imgError, setImgError] = useState(false);

  const getRelativePercent = (clientX: number, clientY: number) => {
    const el = containerRef.current;
    if (!el) return { x: 50, y: 50 };
    const rect = el.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100));
    return { x: Number(x.toFixed(1)), y: Number(y.toFixed(1)) };
  };

  const handlePointerDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const pt = getRelativePercent(e.clientX, e.clientY);

    if (mode === 'spot' && spotTarget && onSpotAttempt) {
      const dx = pt.x - spotTarget.x;
      const dy = pt.y - spotTarget.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      onSpotAttempt(pt.x, pt.y, dist <= spotTarget.radius);
      return;
    }

    if (mode === 'annotate' && onAddMarker) {
      if (drawTool === 'pin') {
        onAddMarker({
          id: `m-${Date.now()}`,
          type: 'pin',
          x: pt.x,
          y: pt.y,
          label: pendingLabel.trim() || 'Finding Pin',
        });
      } else {
        setDragStart(pt);
        setDragCurrent(pt);
      }
    }
  };

  const handlePointerMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (mode === 'annotate' && drawTool === 'box' && dragStart) {
      setDragCurrent(getRelativePercent(e.clientX, e.clientY));
    }
  };

  const handlePointerUp = () => {
    if (mode === 'annotate' && drawTool === 'box' && dragStart && dragCurrent && onAddMarker) {
      const minX = Math.min(dragStart.x, dragCurrent.x);
      const minY = Math.min(dragStart.y, dragCurrent.y);
      const width = Math.abs(dragCurrent.x - dragStart.x);
      const height = Math.abs(dragCurrent.y - dragStart.y);

      if (width >= 3 && height >= 3) {
        onAddMarker({
          id: `m-${Date.now()}`,
          type: 'box',
          x: Number(minX.toFixed(1)),
          y: Number(minY.toFixed(1)),
          width: Number(width.toFixed(1)),
          height: Number(height.toFixed(1)),
          label: pendingLabel.trim() || 'Annotated ROI',
        });
      }
      setDragStart(null);
      setDragCurrent(null);
    }
  };

  const resetViewer = () => {
    setBrightness(100);
    setContrast(105);
    setZoom(1);
    setInvert(false);
  };

  return (
    <div className="bg-[#090D16] rounded-xl border border-slate-800 overflow-hidden flex flex-col">
      {/* PACS Viewer Toolbar */}
      <div className="px-4 py-2.5 bg-[#0F172A] border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-300">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5">
            <SlidersHorizontal className="w-3.5 h-3.5 text-sky-400" />
            <label htmlFor="dicom-brightness" className="text-[11px] text-slate-400 whitespace-nowrap">
              W/L Bright
            </label>
            <input
              id="dicom-brightness"
              type="range"
              min={60}
              max={150}
              value={brightness}
              onChange={(e) => setBrightness(Number(e.target.value))}
              className="w-16 accent-sky-400 cursor-pointer"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <label htmlFor="dicom-contrast" className="text-[11px] text-slate-400 whitespace-nowrap">
              Contrast
            </label>
            <input
              id="dicom-contrast"
              type="range"
              min={75}
              max={175}
              value={contrast}
              onChange={(e) => setContrast(Number(e.target.value))}
              className="w-16 accent-sky-400 cursor-pointer"
            />
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(1, Number((z - 0.2).toFixed(1))))}
            className="p-1.5 rounded hover:bg-slate-800 text-slate-300 cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="font-mono text-[11px] tabular-nums text-slate-300 w-10 text-center">
            {zoom.toFixed(1)}x
          </span>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(2.2, Number((z + 0.2).toFixed(1))))}
            className="p-1.5 rounded hover:bg-slate-800 text-slate-300 cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setInvert((v) => !v)}
            className={`px-2 py-1 rounded text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              invert ? 'bg-sky-500 text-slate-950' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Invert
          </button>
          <button
            type="button"
            onClick={resetViewer}
            className="p-1.5 rounded hover:bg-slate-800 text-slate-300 cursor-pointer"
            title="Reset Windowing"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Annotation Mode Controls */}
      {mode === 'annotate' && (
        <div className="px-4 py-2 bg-slate-900/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setDrawTool('box')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded font-medium whitespace-nowrap shrink-0 cursor-pointer ${
                drawTool === 'box' ? 'bg-[#1D4ED8] text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Square className="w-3.5 h-3.5" />
              Draw ROI Box
            </button>
            <button
              type="button"
              onClick={() => setDrawTool('pin')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded font-medium whitespace-nowrap shrink-0 cursor-pointer ${
                drawTool === 'pin' ? 'bg-[#1D4ED8] text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Crosshair className="w-3.5 h-3.5" />
              Drop Pin
            </button>
            <input
              type="text"
              value={pendingLabel}
              onChange={(e) => setPendingLabel(e.target.value)}
              placeholder="Annotation label..."
              className="h-7 px-2.5 rounded bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-sky-400 w-40"
            />
          </div>

          {onClearMarkers && markers.length > 0 && (
            <button
              type="button"
              onClick={onClearMarkers}
              className="flex items-center gap-1 text-slate-400 hover:text-red-400 text-xs whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear ({markers.length})
            </button>
          )}
        </div>
      )}

      {/* Interactive Image Stage */}
      <div className="relative bg-black flex items-center justify-center overflow-hidden min-h-[340px] lg:min-h-[420px] select-none">
        <div
          ref={containerRef}
          onMouseDown={handlePointerDown}
          onMouseMove={handlePointerMove}
          onMouseUp={handlePointerUp}
          className={`relative w-full max-w-[640px] aspect-[4/3] overflow-hidden ${
            mode === 'spot' || mode === 'annotate' ? 'cursor-crosshair' : 'cursor-default'
          }`}
          style={{
            transform: `scale(${zoom})`,
            transition: 'transform 150ms cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          {imgError ? (
            <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950 text-slate-400 p-6 text-center">
              <AlertCircle className="w-8 h-8 text-slate-500 mb-2" />
              <p className="text-sm font-medium text-slate-300">{alt}</p>
              <p className="text-xs text-slate-500 mt-1">Diagnostic study preview unavailable</p>
            </div>
          ) : (
            <img
              src={imageUrl}
              alt={alt}
              referrerPolicy="no-referrer"
              onError={() => setImgError(true)}
              draggable={false}
              className="w-full h-full object-contain bg-black"
              style={{
                filter: `brightness(${brightness}%) contrast(${contrast}%) ${invert ? 'invert(1)' : ''}`,
              }}
            />
          )}

          {/* Spot-the-Finding feedback marker */}
          {mode === 'spot' && spotHit && (
            <>
              <div
                className={`absolute -translate-x-1/2 -translate-y-1/2 w-7 h-7 rounded-full border-2 flex items-center justify-center pointer-events-none ${
                  spotHit.matched
                    ? 'border-emerald-400 bg-emerald-500/25 text-emerald-300'
                    : 'border-red-400 bg-red-500/25 text-red-300'
                }`}
                style={{ left: `${spotHit.x}%`, top: `${spotHit.y}%` }}
              >
                {spotHit.matched ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              </div>
              {spotTarget && spotHit.matched && (
                <div
                  className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-dashed border-emerald-400/80 pointer-events-none"
                  style={{
                    left: `${spotTarget.x}%`,
                    top: `${spotTarget.y}%`,
                    width: `${spotTarget.radius * 2}%`,
                    height: `${spotTarget.radius * 2}%`,
                  }}
                />
              )}
            </>
          )}

          {/* Active box drag preview */}
          {dragStart && dragCurrent && (
            <div
              className="absolute border-2 border-sky-400 bg-sky-400/15 pointer-events-none"
              style={{
                left: `${Math.min(dragStart.x, dragCurrent.x)}%`,
                top: `${Math.min(dragStart.y, dragCurrent.y)}%`,
                width: `${Math.abs(dragCurrent.x - dragStart.x)}%`,
                height: `${Math.abs(dragCurrent.y - dragStart.y)}%`,
              }}
            />
          )}

          {/* Saved Annotations */}
          {markers.map((marker) =>
            marker.type === 'pin' ? (
              <div
                key={marker.id}
                className="absolute -translate-x-1/2 -translate-y-1/2 group"
                style={{ left: `${marker.x}%`, top: `${marker.y}%` }}
              >
                <div className="w-5 h-5 rounded-full bg-sky-500/30 border-2 border-sky-400 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-sky-300" />
                </div>
                <div className="mt-1 px-1.5 py-0.5 rounded bg-slate-950/90 border border-slate-700 text-[10px] text-sky-200 whitespace-nowrap flex items-center gap-1">
                  <span>{marker.label}</span>
                  {onRemoveMarker && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveMarker(marker.id);
                      }}
                      className="text-slate-400 hover:text-red-400 cursor-pointer"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div
                key={marker.id}
                className="absolute border-2 border-sky-400 bg-sky-400/10"
                style={{
                  left: `${marker.x}%`,
                  top: `${marker.y}%`,
                  width: `${marker.width ?? 10}%`,
                  height: `${marker.height ?? 10}%`,
                }}
              >
                <div className="absolute -top-5 left-0 px-1.5 py-0.5 rounded bg-slate-950/90 border border-slate-700 text-[10px] text-sky-200 whitespace-nowrap flex items-center gap-1">
                  <span>{marker.label}</span>
                  {onRemoveMarker && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveMarker(marker.id);
                      }}
                      className="text-slate-400 hover:text-red-400 cursor-pointer"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
            )
          )}

          {/* Error Review Overlay: Attending Target vs Trainee Marker */}
          {mode === 'review' && reviewOverlay && (
            <>
              <div
                className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-emerald-400 bg-emerald-500/15 pointer-events-none"
                style={{
                  left: `${reviewOverlay.targetZone.x}%`,
                  top: `${reviewOverlay.targetZone.y}%`,
                  width: `${reviewOverlay.targetZone.radius * 2}%`,
                  height: `${reviewOverlay.targetZone.radius * 2}%`,
                }}
              >
                <span className="absolute -top-5 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded bg-emerald-950/90 border border-emerald-500/50 text-[10px] text-emerald-300 whitespace-nowrap">
                  Attending Finding
                </span>
              </div>
              <div
                className="absolute -translate-x-1/2 -translate-y-1/2 w-5 h-5 rounded-full border-2 border-red-400 bg-red-500/30 pointer-events-none"
                style={{
                  left: `${reviewOverlay.traineeMarker.x}%`,
                  top: `${reviewOverlay.traineeMarker.y}%`,
                }}
              >
                <span className="absolute top-6 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded bg-red-950/90 border border-red-500/50 text-[10px] text-red-300 whitespace-nowrap">
                  Trainee Mark
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {caption && (
        <div className="px-4 py-2.5 bg-[#0F172A] border-t border-slate-800 text-xs text-slate-400 flex items-center justify-between gap-4">
          <span>{caption}</span>
          <span className="font-mono text-[11px] text-slate-500 tabular-nums">
            B:{brightness}% · C:{contrast}% · {zoom.toFixed(1)}x
          </span>
        </div>
      )}
    </div>
  );
};

"use client";
import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Copy, Download, ExternalLink, Code2, Eye } from "lucide-react";

export interface Artifact {
  id: string;
  type: "html" | "jsx" | "jsx-render" | "markdown" | "python" | "js" | "css" | "json";
  code: string;
  timestamp: number;
}

interface ArtifactPanelProps {
  artifacts: Artifact[];
  selectedId?: string;
  onSelectVersion?: (id: string) => void;
  onClose?: () => void;
  width?: number; // px
  onWidthChange?: (w: number) => void;
}

const LANGUAGE_MAP: Record<string, string> = {
  html: "html",
  jsx: "jsx",
  "jsx-render": "jsx",
  markdown: "markdown",
  python: "python",
  js: "javascript",
  css: "css",
  json: "json",
};

const EXTENSIONS: Record<string, string> = {
  html: ".html",
  jsx: ".jsx",
  "jsx-render": ".jsx",
  markdown: ".md",
  python: ".py",
  js: ".js",
  css: ".css",
  json: ".json",
};

export function ArtifactPanel({
  artifacts,
  selectedId,
  onSelectVersion,
  onClose,
  width = 480,
  onWidthChange,
}: ArtifactPanelProps) {
  const [mode, setMode] = useState<"preview" | "code">("preview");
  const [previewError, setPreviewError] = useState("");
  const resizeRef = useRef(false);
  const panelRef = useRef<HTMLDivElement>(null);

  if (!artifacts.length) return null;

  const current = artifacts.find(a => a.id === selectedId) || artifacts[artifacts.length - 1];
  if (!current) return null;

  const isRenderableHtml = ["html", "jsx-render"].includes(current.type);
  const isReactComponent = current.type === "jsx";

  // Generate iframe HTML
  const iframeHtml = isReactComponent
    ? `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <style>
    body { margin: 0; padding: 12px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #0C0908; color: #e8d5c4; }
    * { box-sizing: border-box; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel">
    ${current.code}
  </script>
</body>
</html>`
    : current.type === "html"
    ? current.code
    : null;

  const handleDownload = () => {
    const element = document.createElement("a");
    element.setAttribute("href", "data:text/plain;charset=utf-8," + encodeURIComponent(current.code));
    element.setAttribute("download", `artifact-v${artifacts.indexOf(current) + 1}${EXTENSIONS[current.type]}`);
    element.style.display = "none";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(current.code);
  };

  const handleOpenTab = () => {
    if (!isRenderableHtml) return;
    const blob = new Blob([iframeHtml!], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
  };

  const handleMouseDown = () => {
    resizeRef.current = true;
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!resizeRef.current || !panelRef.current) return;
    const newWidth = Math.max(320, Math.min(window.innerWidth * 0.6, window.innerWidth - e.clientX));
    onWidthChange?.(newWidth);
  };

  const handleMouseUp = () => {
    resizeRef.current = false;
  };

  // Add listeners to document
  if (typeof document !== "undefined") {
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }

  return (
    <motion.div
      ref={panelRef}
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      style={{ width }}
      className="flex flex-col h-full glass-dark card border-l border-white/8"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/8 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-[11px] uppercase tracking-widest text-mist">Artifact</span>
          {/* Version Switcher */}
          <div className="flex items-center gap-1">
            {artifacts.map((a, i) => (
              <button
                key={a.id}
                onClick={() => onSelectVersion?.(a.id)}
                className={`text-[10px] font-mono px-2 py-1 rounded transition-colors ${
                  a.id === current.id
                    ? "accent-surface text-snow"
                    : "text-mist hover:bg-white/10"
                }`}
              >
                v{i + 1}
              </button>
            ))}
          </div>
        </div>
        <button onClick={onClose} className="text-mist hover:text-snow text-xs">✕</button>
      </div>

      {/* Mode Switcher */}
      <div className="flex gap-1 px-4 py-2 border-b border-white/8 shrink-0">
        {isRenderableHtml && (
          <button
            onClick={() => setMode("preview")}
            className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded transition-colors ${
              mode === "preview"
                ? "accent-surface text-snow"
                : "text-mist hover:bg-white/10"
            }`}
          >
            <Eye size={14} /> Preview
          </button>
        )}
        <button
          onClick={() => setMode("code")}
          className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded transition-colors ${
            mode === "code"
              ? "accent-surface text-snow"
              : "text-mist hover:bg-white/10"
          }`}
        >
          <Code2 size={14} /> Code
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto">
        {mode === "preview" && isRenderableHtml && iframeHtml ? (
          <iframe
            sandbox="allow-scripts allow-same-origin"
            srcDoc={iframeHtml}
            className="w-full h-full border-0"
          />
        ) : (
          <div className="p-4 font-mono text-xs whitespace-pre-wrap break-words text-snow/80 bg-black/30 h-full overflow-auto">
            {current.code}
          </div>
        )}
        {previewError && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-mist text-sm">
            {previewError}
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="flex items-center gap-2 px-4 py-3 border-t border-white/8 shrink-0">
        <button
          onClick={handleCopy}
          title="Kopieren"
          className="flex items-center gap-1 text-xs px-3 py-1.5 rounded glass-input text-mist hover:bg-white/10 transition-colors"
        >
          <Copy size={14} />
        </button>
        <button
          onClick={handleDownload}
          title="Herunterladen"
          className="flex items-center gap-1 text-xs px-3 py-1.5 rounded glass-input text-mist hover:bg-white/10 transition-colors"
        >
          <Download size={14} />
        </button>
        {isRenderableHtml && (
          <button
            onClick={handleOpenTab}
            title="Im neuen Tab öffnen"
            className="flex items-center gap-1 text-xs px-3 py-1.5 rounded glass-input text-mist hover:bg-white/10 transition-colors"
          >
            <ExternalLink size={14} />
          </button>
        )}
        <div className="flex-1" />
        <span className="text-[10px] text-mist">{current.type}</span>
      </div>

      {/* Resize Handle */}
      <div
        onMouseDown={handleMouseDown}
        className="absolute left-0 top-0 bottom-0 w-1 hover:w-1.5 hover:bg-amber-400/30 cursor-col-resize transition-all"
      />
    </motion.div>
  );
}

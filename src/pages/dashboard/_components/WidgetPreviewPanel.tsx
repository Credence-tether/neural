import { useEffect, useRef, useState } from "react";
import { MessageSquare, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";

export default function WidgetPreviewPanel() {
  const convexSiteUrl = (import.meta.env.VITE_CONVEX_URL as string ?? "")
    .replace(".convex.cloud", ".convex.site")
    .replace(/\/$/, "");

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [key, setKey] = useState(0); // increment to force reload

  // Clear session so each "Reset" starts a fresh conversation
  const clearSession = () => {
    const iframe = iframeRef.current;
    if (iframe?.contentWindow) {
      try {
        iframe.contentWindow.localStorage.clear();
      } catch {
        // cross-origin — reload handles it
      }
    }
    setKey((k) => k + 1);
  };

  // The iframe source is our /test page on convex.site
  const src = `${convexSiteUrl}/test`;

  return (
    <div className="flex flex-col h-full min-h-0 p-4 gap-3">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-indigo-400" />
          <span className="text-sm font-semibold text-white">Widget Preview</span>
          <span className="text-xs bg-green-500/20 text-green-400 border border-green-500/30 rounded-full px-2 py-0.5">
            LIVE
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-zinc-400 hover:text-white"
            onClick={() => setKey((k) => k + 1)}
            title="Reload preview"
          >
            <RefreshCw className="w-3 h-3 mr-1" /> Reload
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-zinc-400 hover:text-red-400"
            onClick={clearSession}
            title="Clear session and start fresh"
          >
            <Trash2 className="w-3 h-3 mr-1" /> Reset
          </Button>
        </div>
      </div>

      {/* Info bar */}
      <div className="flex-shrink-0 text-xs text-zinc-500 bg-zinc-900/60 border border-zinc-800 rounded-lg px-3 py-2">
        Previewing widget from{" "}
        <span className="text-indigo-400 font-mono">{convexSiteUrl}/widget.js</span>
        {" · "}siteUrl locked to <span className="text-indigo-400 font-mono">wolvcapital.com</span>
        {" · "}each deploy auto-updates here
      </div>

      {/* Iframe */}
      <div className="flex-1 min-h-0 rounded-xl overflow-hidden border border-zinc-800">
        {convexSiteUrl ? (
          <iframe
            key={key}
            ref={iframeRef}
            src={src}
            className="w-full h-full border-0"
            title="Widget Preview"
            allow="clipboard-write"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-zinc-500 text-sm">
            <div className="text-center space-y-2">
              <MessageSquare className="w-8 h-8 mx-auto opacity-30" />
              <p>VITE_CONVEX_URL not set</p>
              <p className="text-xs">Add it to your .env file and restart dev server</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

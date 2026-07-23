import { useState } from "react";
import { Label } from "@/components/ui/label.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Button } from "@/components/ui/button.tsx";
import { ScrollArea } from "@/components/ui/scroll-area.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import { toast } from "sonner";
import { Copy, Check, Code2, Zap, MessageSquarePlus } from "lucide-react";
import { cn } from "@/lib/utils.ts";
import CannedResponsesPanel from "./CannedResponsesPanel.tsx";

const AI_PROVIDERS = [
  { value: "openai", label: "OpenAI (GPT-5)" },
  { value: "groq", label: "Groq (Llama)" },
  { value: "gemini", label: "Google Gemini" },
  { value: "ollama", label: "Ollama (Local)" },
];

const EMBED_MODELS = [
  { value: "openai", label: "OpenAI text-embedding-3-small" },
  { value: "ollama", label: "Ollama nomic-embed-text (free/local)" },
];

export default function SettingsPanel() {
  const [tab, setTab] = useState<"widget" | "canned">("widget");
  const [copied, setCopied] = useState(false);
  const [widgetSite, setWidgetSite] = useState("https://yoursite.com");

  const deploymentUrl = import.meta.env.VITE_CONVEX_URL as string ?? "";
  const convexUrl = deploymentUrl.replace(".cloud", ".site");

  const snippet = `<!-- NeuralSupport Widget -->
<script>
  window.NeuralSupportConfig = {
    convexUrl: "${convexUrl}",
    siteUrl: "${widgetSite}",
    primaryColor: "#6366f1",
    greeting: "Hi! How can I help you today?",
    agentName: "Support",
    // Up to 4 tap-to-send starter questions shown under the greeting
    quickQuestions: [
      "What can you help me with?",
      "I want to speak to a human",
    ],
  };
</script>
<script src="${convexUrl}/widget.js" async></script>`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(snippet);
    setCopied(true);
    toast.success("Snippet copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Tab switcher */}
      <div className="flex border-b border-border flex-shrink-0">
        {([
          { id: "widget" as const, icon: Code2, label: "Widget & Secrets" },
          { id: "canned" as const, icon: MessageSquarePlus, label: "Canned Responses" },
        ] as const).map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors cursor-pointer border-b-2",
              tab === id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {tab === "canned" ? (
        <CannedResponsesPanel />
      ) : (
      <ScrollArea className="h-full">
      <div className="p-4 space-y-6">
        {/* Widget embed */}
        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-1">Widget Embed Code</h3>
            <p className="text-xs text-muted-foreground">
              Copy and paste this snippet just before the closing {"</body>"} tag on your website.
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Your Website URL</Label>
            <Input
              value={widgetSite}
              onChange={(e) => setWidgetSite(e.target.value)}
              placeholder="https://yoursite.com"
              className="text-sm bg-secondary border-border"
            />
          </div>

          <div className="relative">
            <pre className="text-xs bg-secondary/80 border border-border rounded-lg p-3 overflow-x-auto text-muted-foreground font-mono leading-relaxed whitespace-pre-wrap break-all">
              {snippet}
            </pre>
            <Button
              size="sm"
              onClick={handleCopy}
              className="absolute top-2 right-2 h-7 gap-1 text-xs"
            >
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              {copied ? "Copied!" : "Copy"}
            </Button>
          </div>
        </div>

        <Separator />

        {/* AI Config */}
        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-1">AI Configuration</h3>
            <p className="text-xs text-muted-foreground">
              Configured via Secrets in the Hercules dashboard. Set these keys:
            </p>
          </div>

          <div className="space-y-2">
            {[
              { key: "AI_PROVIDER", desc: "openai | groq | gemini | ollama" },
              { key: "OPENAI_API_KEY", desc: "For OpenAI GPT-5" },
              { key: "GROQ_API_KEY", desc: "For Groq (Llama models)" },
              { key: "GEMINI_API_KEY", desc: "For Google Gemini" },
              { key: "OLLAMA_BASE_URL", desc: "http://localhost:11434 for local Ollama" },
              { key: "AI_MODEL", desc: "e.g. gpt-4o, llama-3.3-70b-versatile, gemini-2.0-flash" },
              { key: "EMBED_PROVIDER", desc: "openai | gemini | ollama" },
              { key: "FIRECRAWL_API_KEY", desc: "For website crawling (firecrawl.dev)" },
            ].map(({ key, desc }) => (
              <div key={key} className="flex items-start gap-2 px-3 py-2 rounded-lg bg-secondary/50 border border-border">
                <Code2 className="h-3.5 w-3.5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-mono font-medium text-foreground">{key}</p>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="px-3 py-2.5 rounded-lg bg-primary/10 border border-primary/20">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="h-3.5 w-3.5 text-primary" />
              <p className="text-xs font-medium text-primary">Free AI Option</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Set <span className="font-mono">AI_PROVIDER=ollama</span> and <span className="font-mono">EMBED_PROVIDER=ollama</span> with your local Ollama instance for a completely free setup.
            </p>
          </div>
        </div>

        <Separator />

        {/* Push notifications */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground">Push Notifications</h3>
          <p className="text-xs text-muted-foreground">
            Push notifications are powered by Hercules Cloud and require no additional API keys. Enable them from the notification bell in the dashboard header.
          </p>
        </div>
      </div>
    </ScrollArea>
      )}
    </div>
  );
}

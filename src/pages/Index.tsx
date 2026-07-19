import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button.tsx";
import { Zap, Bot, Globe, Bell, Users, ShieldCheck, ArrowRight, Code2 } from "lucide-react";

const features = [
  {
    icon: Bot,
    title: "Multi-Provider AI",
    desc: "OpenAI GPT, Groq (Llama), Gemini, or Ollama. Swap providers with a single env variable.",
  },
  {
    icon: Globe,
    title: "Site Knowledge RAG",
    desc: "Crawl your website with Firecrawl, embed content, and give the AI precise knowledge.",
  },
  {
    icon: Bell,
    title: "Instant Push Alerts",
    desc: "Agents get push notifications the moment a visitor lands — even in the background.",
  },
  {
    icon: Users,
    title: "Live Visitor Tracking",
    desc: "See every visitor's current page, location, country, and navigation journey in real time.",
  },
  {
    icon: ShieldCheck,
    title: "AI Persistence",
    desc: "AI holds conversations gracefully until a human agent takes over. Never leaves a visitor hanging.",
  },
  {
    icon: Code2,
    title: "One-Line Embed",
    desc: "Add the premium mobile-optimized widget to any site with a single <script> tag.",
  },
];

export default function Index() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Nav */}
      <nav className="border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
            <Zap className="h-4 w-4 text-primary" />
          </div>
          <span className="text-sm font-bold text-foreground">NeuralSupport</span>
        </div>
        <Link to="/dashboard">
          <Button size="sm" className="gap-2">
            Open Dashboard <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </Link>
      </nav>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-20 text-center">
        <div className="max-w-3xl mx-auto space-y-6 ns-fade-in">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-medium">
            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            AI-Powered Live Support
          </div>

          <h1 className="text-5xl md:text-6xl font-bold text-balance leading-tight">
            Support that never
            <span className="text-primary"> sleeps</span>
          </h1>

          <p className="text-lg text-muted-foreground text-balance max-w-xl mx-auto">
            Intelligent AI chat with site-specific knowledge, real-time visitor tracking, and instant agent notifications — all in one embeddable widget.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Link to="/dashboard">
              <Button size="lg" className="gap-2 w-full sm:w-auto">
                <Zap className="h-4 w-4" />
                Open Agent Dashboard
              </Button>
            </Link>
          </div>
        </div>

        {/* Features grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-20 max-w-4xl mx-auto w-full ns-fade-in-delayed">
          {features.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="text-left p-5 rounded-xl border border-border bg-card hover:border-primary/30 transition-colors"
            >
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                <Icon className="h-[18px] w-[18px] text-primary" />
              </div>
              <h3 className="text-sm font-semibold text-foreground mb-1">{title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

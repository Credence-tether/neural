import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { useState, useEffect, useCallback, useRef } from "react";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { SignInButton } from "@/components/ui/signin.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import AnalyticsPanel from "./_components/AnalyticsPanel.tsx";
import ConversationList from "./_components/ConversationList.tsx";
import ConversationThread from "./_components/ConversationThread.tsx";
import VisitorPanel from "./_components/VisitorPanel.tsx";
import LiveVisitorsPanel from "./_components/LiveVisitorsPanel.tsx";
import KnowledgeBasePanel from "./_components/KnowledgeBasePanel.tsx";
import SettingsPanel from "./_components/SettingsPanel.tsx";
import { usePushNotifications } from "@/hooks/use-push-notifications.ts";
import { useConvexAuth } from "convex/react";
import { cn } from "@/lib/utils.ts";
import {
  MessageSquare, Users, Database, Settings, Bell, BellOff, Zap,
  LogOut, BarChart2, ChevronLeft, Info, Circle,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth.ts";
import { toast } from "sonner";

type View = "inbox" | "visitors" | "analytics" | "knowledge" | "settings";
type MobileLayer = "nav" | "thread" | "details";

/**
 * Browser-history trap:
 * We push a sentinel state on mount and re-push whenever the user goes "deeper"
 * (opens a thread / details). popstate then unwinds our internal layers instead
 * of leaving the dashboard. The agent can never accidentally swipe out of the app.
 */
function useBackTrap(layer: MobileLayer, goBack: () => boolean) {
  const goBackRef = useRef(goBack);
  goBackRef.current = goBack;

  useEffect(() => {
    // Seed two entries so there's always something to pop without exiting
    history.pushState({ ns: true }, "");
    const onPop = (e: PopStateEvent) => {
      const handled = goBackRef.current();
      // Always re-arm the trap so the next back press is also intercepted
      history.pushState({ ns: true }, "");
      if (!handled) {
        // Already at root — swallow the event silently (stay in dashboard)
      }
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
}

/** Plays a short notification chime using WebAudio (no asset needed). */
function useChime() {
  const ctxRef = useRef<AudioContext | null>(null);
  return useCallback(() => {
    try {
      ctxRef.current ??= new AudioContext();
      const ctx = ctxRef.current;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.setValueAtTime(880, ctx.currentTime);
      o.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.08);
      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
      o.connect(g).connect(ctx.destination);
      o.start();
      o.stop(ctx.currentTime + 0.4);
    } catch { /* audio blocked until first gesture — fine */ }
  }, []);
}

function DashboardInner() {
  const [view, setView] = useState<View>("inbox");
  const [selectedConvo, setSelectedConvo] = useState<Id<"conversations"> | null>(null);
  const [selectedVisitorId, setSelectedVisitorId] = useState<Id<"visitors"> | null>(null);
  const [layer, setLayer] = useState<MobileLayer>("nav");
  const { isAuthenticated } = useConvexAuth();
  const { status, subscribe, unsubscribe } = usePushNotifications(isAuthenticated);
  const { signOut } = useAuth();
  const currentUser = useQuery(api.users.getCurrentUser);
  const allConvos = useQuery(api.conversations.getAllConversations);
  const chime = useChime();

  const openCount = allConvos?.filter(c => c.status !== "closed").length ?? 0;
  const urgentCount = allConvos?.filter(c => c.aiStruggling && c.status !== "closed").length ?? 0;

  // ── New-message chime: watch the newest lastMessageAt across conversations ──
  const lastSeenRef = useRef<number>(Date.now());
  useEffect(() => {
    if (!allConvos) return;
    const newest = Math.max(...allConvos.map(c => new Date(c.lastMessageAt ?? 0).getTime()), 0);
    if (newest > lastSeenRef.current) {
      lastSeenRef.current = newest;
      chime();
    }
  }, [allConvos, chime]);

  // ── Back-gesture trap: unwind layers, never exit ──
  const handleInternalBack = useCallback((): boolean => {
    if (layer === "details") { setLayer("thread"); return true; }
    if (layer === "thread") { setLayer("nav"); return true; }
    return false; // at root — stay put
  }, [layer]);
  useBackTrap(layer, handleInternalBack);

  const openConversation = (id: Id<"conversations">) => {
    setSelectedConvo(id);
    setSelectedVisitorId(null);
    setLayer("thread");
    history.pushState({ ns: true }, "");
  };

  const openVisitor = (id: Id<"visitors">) => {
    setSelectedVisitorId(id);
    setLayer("details");
    history.pushState({ ns: true }, "");
  };

  const openDetails = () => {
    setLayer("details");
    history.pushState({ ns: true }, "");
  };

  const navItems = [
    { id: "inbox" as View, icon: MessageSquare, label: "Inbox", count: openCount, urgent: urgentCount },
    { id: "visitors" as View, icon: Users, label: "Visitors" },
    { id: "analytics" as View, icon: BarChart2, label: "Analytics" },
    { id: "knowledge" as View, icon: Database, label: "Knowledge" },
    { id: "settings" as View, icon: Settings, label: "Settings" },
  ];

  const showList = view === "inbox";

  return (
    <div className="flex h-dvh bg-background overflow-hidden">

      {/* ══ Rail (desktop) / Bottom bar (mobile) ══ */}
      <nav className={cn(
        // Mobile: fixed bottom tab bar
        "fixed bottom-0 inset-x-0 z-40 flex border-t border-border bg-background/95 backdrop-blur",
        "pb-[env(safe-area-inset-bottom)]",
        // Desktop: left vertical rail
        "md:relative md:flex-col md:w-16 md:border-t-0 md:border-r md:pb-0 md:bg-sidebar",
        // Hide bottom bar when inside a thread on mobile (full-screen chat)
        layer !== "nav" && "hidden md:flex"
      )}>
        <div className="hidden md:flex items-center justify-center py-4">
          <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center">
            <Zap className="h-4.5 w-4.5 text-primary" />
          </div>
        </div>

        <div className="flex flex-1 md:flex-col md:gap-1 md:px-2">
          {navItems.map(({ id, icon: Icon, label, count, urgent }) => (
            <button
              key={id}
              onClick={() => { setView(id); setLayer("nav"); }}
              className={cn(
                "relative flex-1 md:flex-none flex flex-col items-center justify-center gap-0.5 py-2 md:py-2.5 md:rounded-xl transition-colors cursor-pointer",
                view === id
                  ? "text-primary md:bg-primary/12"
                  : "text-muted-foreground hover:text-foreground md:hover:bg-sidebar-accent"
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-medium md:hidden">{label}</span>
              {count !== undefined && count > 0 && (
                <span className={cn(
                  "absolute top-1 right-[calc(50%-16px)] md:top-1 md:right-1 min-w-[16px] h-4 px-1 rounded-full text-[10px] font-bold flex items-center justify-center",
                  urgent && urgent > 0 ? "bg-amber-500 text-black" : "bg-primary text-primary-foreground"
                )}>
                  {count > 99 ? "99+" : count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Desktop rail footer */}
        <div className="hidden md:flex flex-col items-center gap-2 py-3">
          <button
            onClick={() => void (status === "subscribed" ? unsubscribe() : subscribe())}
            title="Notifications"
            className="p-2 rounded-lg hover:bg-sidebar-accent transition-colors cursor-pointer"
          >
            {status === "subscribed"
              ? <Bell className="h-4 w-4 text-primary" />
              : <BellOff className="h-4 w-4 text-muted-foreground" />}
          </button>
          <button
            onClick={() => void signOut()}
            title="Sign out"
            className="p-2 rounded-lg hover:bg-sidebar-accent transition-colors cursor-pointer"
          >
            <LogOut className="h-4 w-4 text-muted-foreground" />
          </button>
          <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center" title={currentUser?.name ?? "Agent"}>
            <span className="text-xs font-bold text-primary">{currentUser?.name?.[0]?.toUpperCase() ?? "A"}</span>
          </div>
        </div>
      </nav>

      {/* ══ List column ══ */}
      <section className={cn(
        "flex-col min-w-0 border-r border-border",
        "w-full md:w-80 md:flex-shrink-0",
        // Mobile: only visible at nav layer
        layer === "nav" ? "flex pb-14 md:pb-0" : "hidden md:flex"
      )}>
        {/* Column header */}
        <header className="flex items-center gap-2 px-4 py-3 border-b border-border flex-shrink-0">
          <h1 className="text-base font-bold text-foreground capitalize flex-1">{view === "inbox" ? "Inbox" : view}</h1>
          {view === "inbox" && urgentCount > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 font-medium">
              {urgentCount} need help
            </span>
          )}
          {/* Mobile-only quick actions */}
          <button
            onClick={() => void (status === "subscribed" ? unsubscribe() : subscribe())}
            className="md:hidden p-1.5 rounded hover:bg-secondary transition-colors"
          >
            {status === "subscribed"
              ? <Bell className="h-4 w-4 text-primary" />
              : <BellOff className="h-4 w-4 text-muted-foreground" />}
          </button>
          <button onClick={() => void signOut()} className="md:hidden p-1.5 rounded hover:bg-secondary transition-colors">
            <LogOut className="h-4 w-4 text-muted-foreground" />
          </button>
        </header>

        <div className="flex-1 min-h-0 overflow-hidden">
          {view === "inbox" && (
            <ConversationList selectedId={selectedConvo} onSelect={openConversation} />
          )}
          {view === "visitors" && <LiveVisitorsPanel onSelect={openVisitor} />}
          {view === "analytics" && <AnalyticsPanel />}
          {view === "knowledge" && <KnowledgeBasePanel />}
          {view === "settings" && <SettingsPanel />}
        </div>
      </section>

      {/* ══ Thread column ══ */}
      <main className={cn(
        "flex-1 flex-col min-w-0",
        layer === "thread" ? "flex" : "hidden",
        "md:flex"
      )}>
        {/* Mobile thread header w/ back + details */}
        {selectedConvo && (
          <div className="md:hidden flex items-center gap-1 px-2 py-2 border-b border-border flex-shrink-0 bg-background">
            <button
              onClick={() => setLayer("nav")}
              className="p-2 rounded-lg hover:bg-secondary active:bg-secondary transition-colors"
              aria-label="Back to inbox"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span className="text-sm font-semibold flex-1 truncate">Chat</span>
            <button
              onClick={openDetails}
              className="p-2 rounded-lg hover:bg-secondary transition-colors"
              aria-label="Visitor details"
            >
              <Info className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>
        )}
        {selectedConvo ? (
          <ConversationThread conversationId={selectedConvo} />
        ) : (
          <div className="flex-1 hidden md:flex flex-col items-center justify-center gap-4 p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <MessageSquare className="h-8 w-8 text-primary/30" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground mb-1">
                {openCount === 0 ? "Waiting for your first chat" : "Select a conversation"}
              </h2>
              <p className="text-sm text-muted-foreground max-w-xs">
                {openCount === 0
                  ? "Install the widget on your site — new chats land here in real time."
                  : "Choose a chat from the inbox to start helping."}
              </p>
            </div>
          </div>
        )}
      </main>

      {/* ══ Details column ══ */}
      <aside className={cn(
        "flex-col border-l border-border",
        "w-full md:w-72 md:flex-shrink-0",
        layer === "details" ? "flex" : "hidden",
        "xl:flex" // always visible on wide screens
      )}>
        <div className="md:hidden xl:hidden flex items-center gap-1 px-2 py-2 border-b border-border flex-shrink-0">
          <button
            onClick={() => setLayer(selectedConvo ? "thread" : "nav")}
            className="p-2 rounded-lg hover:bg-secondary transition-colors"
            aria-label="Back"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="text-sm font-semibold">Visitor details</span>
        </div>
        <div className="flex-1 min-h-0 overflow-hidden">
          <VisitorPanel conversationId={selectedConvo} visitorId={selectedVisitorId} />
        </div>
      </aside>
    </div>
  );
}

export default function Dashboard() {
  return (
    <>
      <AuthLoading>
        <div className="h-dvh flex items-center justify-center bg-background">
          <div className="space-y-3 text-center">
            <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center mx-auto">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <Skeleton className="h-3 w-32 mx-auto rounded" />
          </div>
        </div>
      </AuthLoading>
      <Unauthenticated>
        <div className="h-dvh flex items-center justify-center bg-background px-4">
          <div className="text-center space-y-6 w-full max-w-sm">
            <div className="w-14 h-14 rounded-2xl bg-primary/15 flex items-center justify-center mx-auto">
              <Zap className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground mb-1">NeuralSupport</h1>
              <p className="text-sm text-muted-foreground">Sign in to your agent dashboard</p>
            </div>
            <SignInButton className="w-full" />
          </div>
        </div>
      </Unauthenticated>
      <Authenticated>
        <DashboardInner />
      </Authenticated>
    </>
  );
}

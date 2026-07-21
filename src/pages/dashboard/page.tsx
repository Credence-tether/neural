import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { useState } from "react";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { SignInButton } from "@/components/ui/signin.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import AnalyticsPanel from "./_components/AnalyticsPanel.tsx";
import ConversationList from "./_components/ConversationList.tsx";
import ConversationThread from "./_components/ConversationThread.tsx";
import VisitorPanel from "./_components/VisitorPanel.tsx";
import LiveVisitorsPanel from "./_components/LiveVisitorsPanel.tsx";
import KnowledgeBasePanel from "./_components/KnowledgeBasePanel.tsx";
import SettingsPanel from "./_components/SettingsPanel.tsx";
import { usePushNotifications } from "@/hooks/use-push-notifications.ts";
import VisitorDetailCard from "./_components/VisitorDetailCard.tsx";
import { useConvexAuth } from "convex/react";
import { cn } from "@/lib/utils.ts";
import {
  MessageSquare, Users, Database, Settings, Bell, BellOff, Zap,
  LogOut, BarChart2, ArrowLeft, Info,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth.ts";
import { toast } from "sonner";

type MobilePanel = "sidebar" | "thread" | "details";

function DashboardInner() {
  const [selectedConvo, setSelectedConvo] = useState<Id<"conversations"> | null>(null);
  const [selectedVisitorId, setSelectedVisitorId] = useState<Id<"visitors"> | null>(null);
  const [sidebarTab, setSidebarTab] = useState<"conversations" | "visitors" | "analytics" | "knowledge" | "settings">("conversations");
  const [rightPanel, setRightPanel] = useState<"visitor" | "live">("visitor");
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>("sidebar");
  const { isAuthenticated } = useConvexAuth();
  const { status, subscribe, unsubscribe } = usePushNotifications(isAuthenticated);
  const { signOut } = useAuth();
  const currentUser = useQuery(api.users.getCurrentUser);
  const allConvos = useQuery(api.conversations.getAllConversations);
  const openCount = allConvos?.filter(c => c.status !== "closed").length ?? 0;
  const strugglingCount = allConvos?.filter(c => c.aiStruggling).length ?? 0;

  const handleTogglePush = async () => {
    if (status === "subscribed") {
      await unsubscribe();
      toast("Push notifications disabled");
    } else if (status === "unsubscribed") {
      await subscribe();
    } else if (status === "iframe") {
      toast.info("Push notifications can only be tested after publishing");
    } else if (status === "denied") {
      toast.error("Notifications blocked. Enable in browser settings then refresh.");
    }
  };

  const handleSelectConvo = (id: Id<"conversations">) => {
    setSelectedConvo(id);
    setSelectedVisitorId(null);
    setMobilePanel("thread");
  };

  const handleSelectVisitor = (id: Id<"visitors">) => {
    setSelectedVisitorId(id);
    setRightPanel("visitor");
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <div
        className={cn(
          "w-full md:w-64 flex-shrink-0 flex-col bg-sidebar border-r border-sidebar-border",
          mobilePanel === "sidebar" ? "flex" : "hidden md:flex"
        )}
      >
        {/* Logo */}
        <div className="px-4 py-4 flex items-center gap-2.5 border-b border-sidebar-border">
          <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
            <Zap className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-bold text-sidebar-foreground">NeuralSupport</p>
            <p className="text-xs text-muted-foreground">Agent Dashboard</p>
          </div>
        </div>

        {/* Nav tabs */}
        <div className="p-2 space-y-0.5 border-b border-sidebar-border">
          {[
            { id: "conversations" as const, icon: MessageSquare, label: "Conversations", badge: openCount > 0 ? openCount : undefined },
            { id: "visitors" as const, icon: Users, label: "Live Visitors" },
            { id: "analytics" as const, icon: BarChart2, label: "Analytics" },
            { id: "knowledge" as const, icon: Database, label: "Knowledge Base" },
            { id: "settings" as const, icon: Settings, label: "Settings & Widget" },
          ].map(({ id, icon: Icon, label, badge }) => (
            <button
              key={id}
              onClick={() => setSidebarTab(id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all cursor-pointer text-sm",
                sidebarTab === id
                  ? "bg-sidebar-primary/15 text-sidebar-primary font-medium"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
              )}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              <span className="flex-1">{label}</span>
              {badge !== undefined && (
                <span className={cn(
                  "text-xs px-1.5 py-0.5 rounded-full font-medium",
                  strugglingCount > 0
                    ? "bg-amber-500/20 text-amber-400"
                    : "bg-primary/20 text-primary"
                )}>
                  {badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Sidebar content */}
        <div className="flex-1 min-h-0 overflow-hidden">
          {sidebarTab === "conversations" && (
            <ConversationList selectedId={selectedConvo} onSelect={handleSelectConvo} />
          )}
          {sidebarTab === "visitors" && <LiveVisitorsPanel />}
          {sidebarTab === "analytics" && <AnalyticsPanel />}
          {sidebarTab === "knowledge" && <KnowledgeBasePanel />}
          {sidebarTab === "settings" && <SettingsPanel />}
        </div>

        {/* Agent info */}
        <div className="p-3 border-t border-sidebar-border">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-medium text-primary">
                {currentUser?.name?.[0]?.toUpperCase() ?? "A"}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-sidebar-foreground truncate">{currentUser?.name ?? "Agent"}</p>
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span className="text-xs text-muted-foreground">Online</span>
              </div>
            </div>
            <button
              onClick={handleTogglePush}
              title={status === "subscribed" ? "Disable notifications" : "Enable notifications"}
              className="p-1.5 rounded hover:bg-sidebar-accent transition-colors cursor-pointer"
            >
              {status === "subscribed" ? (
                <Bell className="h-3.5 w-3.5 text-primary" />
              ) : (
                <BellOff className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </button>
            <button
              onClick={() => void signOut()}
              title="Sign out"
              className="p-1.5 rounded hover:bg-sidebar-accent transition-colors cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </div>
        </div>
      </div>

      {/* Main chat area */}
      <div
        className={cn(
          "flex-1 flex-col min-w-0",
          mobilePanel === "thread" ? "flex" : "hidden md:flex"
        )}
      >
        {/* Mobile-only header bar */}
        {selectedConvo && (
          <div className="md:hidden flex items-center gap-2 px-3 py-2 border-b border-border flex-shrink-0">
            <button
              onClick={() => setMobilePanel("sidebar")}
              className="p-1.5 rounded hover:bg-secondary transition-colors cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-medium flex-1">Conversation</span>
            <button
              onClick={() => setMobilePanel("details")}
              className="p-1.5 rounded hover:bg-secondary transition-colors cursor-pointer"
            >
              <Info className="h-4 w-4" />
            </button>
          </div>
        )}
        {selectedConvo ? (
          <ConversationThread conversationId={selectedConvo} />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <MessageSquare className="h-8 w-8 text-primary/40" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-1">Select a Conversation</h2>
              <p className="text-sm text-muted-foreground max-w-sm">
                Choose a conversation from the sidebar to view messages and visitor details.
              </p>
            </div>
            {openCount === 0 && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary/50 border border-border">
                <Zap className="h-4 w-4 text-primary" />
                <p className="text-sm text-muted-foreground">
                  Embed the widget on your site to start receiving chats
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right panel — visitor + live */}
      <div
        className={cn(
          "w-full md:w-72 flex-shrink-0 flex-col border-l border-border",
          mobilePanel === "details" ? "flex" : "hidden md:flex"
        )}
      >
        {/* Mobile-only back bar */}
        <div className="md:hidden flex items-center gap-2 px-3 py-2 border-b border-border flex-shrink-0">
          <button
            onClick={() => setMobilePanel("thread")}
            className="p-1.5 rounded hover:bg-secondary transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-medium">Details</span>
        </div>
        <div className="flex border-b border-border flex-shrink-0">
          <button
            onClick={() => setRightPanel("visitor")}
            className={cn(
              "flex-1 text-xs py-2.5 font-medium transition-colors cursor-pointer",
              rightPanel === "visitor"
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Visitor Details
          </button>
          <button
            onClick={() => setRightPanel("live")}
            className={cn(
              "flex-1 text-xs py-2.5 font-medium transition-colors cursor-pointer flex items-center justify-center gap-1.5",
              rightPanel === "live"
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Live
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-hidden">
          {rightPanel === "visitor" ? (
            <VisitorPanel conversationId={selectedConvo} visitorId={selectedVisitorId} />
          ) : (
            <LiveVisitorsPanel onSelect={handleSelectVisitor} />
          )}
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  return (
    <>
      <AuthLoading>
        <div className="h-screen flex items-center justify-center bg-background">
          <Skeleton className="h-12 w-48 rounded-lg" />
        </div>
      </AuthLoading>
      <Unauthenticated>
        <div className="h-screen flex items-center justify-center bg-background px-4">
          <div className="text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-primary/15 flex items-center justify-center mx-auto">
              <Zap className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground mb-2">NeuralSupport</h1>
              <p className="text-muted-foreground text-sm">Sign in to access the agent dashboard</p>
            </div>
            <SignInButton className="mx-auto" />
          </div>
        </div>
      </Unauthenticated>
      <Authenticated>
        <DashboardInner />
      </Authenticated>
    </>
  );
}

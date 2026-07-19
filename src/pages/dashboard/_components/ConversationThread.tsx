import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils.ts";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { Badge } from "@/components/ui/badge.tsx";
import { ScrollArea } from "@/components/ui/scroll-area.tsx";
import { Bot, User, Headphones, Clock, AlertTriangle } from "lucide-react";

type Props = {
  selectedId: Id<"conversations"> | null;
  onSelect: (id: Id<"conversations">) => void;
};

const statusConfig = {
  open: { label: "Open", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  ai_handling: { label: "AI", color: "bg-violet-500/20 text-violet-400 border-violet-500/30" },
  agent_handling: { label: "Agent", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  waiting_agent: { label: "Waiting", color: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  closed: { label: "Closed", color: "bg-muted text-muted-foreground border-border" },
};

export default function ConversationList({ selectedId, onSelect }: Props) {
  const conversations = useQuery(api.conversations.getAllConversations);

  if (!conversations) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-2 p-6 text-center">
        <Headphones className="h-8 w-8 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">No conversations yet</p>
        <p className="text-xs text-muted-foreground/60">They'll appear here when visitors start chatting</p>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1">
      <div className="p-2 space-y-1">
        {conversations.map((convo) => {
          const cfg = statusConfig[convo.status] ?? statusConfig.open;
          const isSelected = selectedId === convo._id;
          const timeAgo = formatDistanceToNow(new Date(convo.lastMessageAt), { addSuffix: true });

          return (
            <button
              key={convo._id}
              onClick={() => onSelect(convo._id)}
              className={cn(
                "w-full text-left rounded-lg px-3 py-3 transition-all cursor-pointer group",
                isSelected
                  ? "bg-primary/15 border border-primary/30"
                  : "hover:bg-secondary border border-transparent"
              )}
            >
              <div className="flex items-start gap-3">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
                  isSelected ? "bg-primary/20" : "bg-secondary"
                )}>
                  <User className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-sm font-medium text-foreground truncate">
                      {convo.visitorName ?? "Anonymous Visitor"}
                    </span>
                    <span className="text-xs text-muted-foreground flex-shrink-0">{timeAgo}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn("text-xs px-1.5 py-0.5 rounded border", cfg.color)}>
                      {convo.aiStruggling ? (
                        <span className="flex items-center gap-1">
                          <AlertTriangle className="h-2.5 w-2.5" />
                          Needs Help
                        </span>
                      ) : (
                        cfg.label
                      )}
                    </span>
                    {convo.agentMode && (
                      <Bot className="h-3 w-3 text-muted-foreground" />
                    )}
                    {convo.siteUrl && (
                      <span className="text-xs text-muted-foreground/60 truncate">
                        {new URL(convo.siteUrl).hostname}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </ScrollArea>
  );
}

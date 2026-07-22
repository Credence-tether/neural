import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { useState, useMemo } from "react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils.ts";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import {
  Bot, User, Headphones, AlertTriangle, Search, X,
} from "lucide-react";

type Props = {
  selectedId: Id<"conversations"> | null;
  onSelect: (id: Id<"conversations">) => void;
};

type Filter = "active" | "urgent" | "ai" | "agent" | "closed" | "all";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "active", label: "Active" },
  { id: "urgent", label: "Needs help" },
  { id: "ai", label: "AI" },
  { id: "agent", label: "Agent" },
  { id: "closed", label: "Closed" },
  { id: "all", label: "All" },
];

export default function ConversationList({ selectedId, onSelect }: Props) {
  const conversations = useQuery(api.conversations.getAllConversations);
  const [filter, setFilter] = useState<Filter>("active");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!conversations) return undefined;
    let list = conversations;

    switch (filter) {
      case "active": list = list.filter(c => c.status !== "closed"); break;
      case "urgent": list = list.filter(c => c.aiStruggling && c.status !== "closed"); break;
      case "ai": list = list.filter(c => !c.agentMode && c.status !== "closed"); break;
      case "agent": list = list.filter(c => c.agentMode && c.status !== "closed"); break;
      case "closed": list = list.filter(c => c.status === "closed"); break;
      case "all": break;
    }

    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(c =>
        (c.visitorName ?? "").toLowerCase().includes(q) ||
        (c.visitorEmail ?? "").toLowerCase().includes(q) ||
        (c.siteUrl ?? "").toLowerCase().includes(q)
      );
    }

    // Urgent first, then most recent
    return [...list].sort((a, b) => {
      if (!!a.aiStruggling !== !!b.aiStruggling) return a.aiStruggling ? -1 : 1;
      return new Date(b.lastMessageAt ?? 0).getTime() - new Date(a.lastMessageAt ?? 0).getTime();
    });
  }, [conversations, filter, search]);

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="px-3 pt-3 pb-2 flex-shrink-0">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, site…"
            className="w-full h-9 pl-8 pr-8 rounded-lg bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-primary/50 transition-colors"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-background transition-colors"
            >
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      {/* Filter chips — horizontally scrollable on mobile */}
      <div className="px-3 pb-2 flex-shrink-0 overflow-x-auto scrollbar-none">
        <div className="flex gap-1.5 w-max">
          {FILTERS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setFilter(id)}
              className={cn(
                "px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors cursor-pointer border",
                filter === id
                  ? "bg-primary/15 text-primary border-primary/30"
                  : "bg-transparent text-muted-foreground border-border hover:text-foreground hover:border-muted-foreground/40"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
        <div className="px-2 pb-2 space-y-0.5">
          {!filtered && (
            <div className="flex items-center justify-center py-10">
              <div className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            </div>
          )}

          {filtered?.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 gap-2 text-center px-4">
              <Headphones className="h-7 w-7 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">
                {search ? "No matches" : filter === "closed" ? "No closed chats" : "No conversations here"}
              </p>
              <p className="text-xs text-muted-foreground/60">
                {search ? "Try a different search" : "New chats appear instantly"}
              </p>
            </div>
          )}

          {filtered?.map((convo) => {
            const isSelected = selectedId === convo._id;
            const urgent = convo.aiStruggling && convo.status !== "closed";
            const timeAgo = formatDistanceToNow(new Date(convo.lastMessageAt), { addSuffix: false })
              .replace("about ", "").replace("less than a minute", "now");

            return (
              <button
                key={convo._id}
                onClick={() => onSelect(convo._id)}
                className={cn(
                  "w-full text-left rounded-xl px-3 py-3 transition-colors cursor-pointer border",
                  isSelected
                    ? "bg-primary/10 border-primary/25"
                    : urgent
                    ? "bg-amber-500/5 border-amber-500/20 hover:bg-amber-500/10"
                    : "border-transparent hover:bg-secondary"
                )}
              >
                <div className="flex items-start gap-2.5">
                  {/* Avatar with status ring */}
                  <div className="relative flex-shrink-0">
                    <div className={cn(
                      "w-9 h-9 rounded-full flex items-center justify-center",
                      urgent ? "bg-amber-500/15" : "bg-secondary"
                    )}>
                      <User className={cn("h-4 w-4", urgent ? "text-amber-400" : "text-muted-foreground")} />
                    </div>
                    {/* Handler dot */}
                    <div className={cn(
                      "absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-background flex items-center justify-center",
                      convo.agentMode ? "bg-emerald-500" : "bg-violet-500"
                    )}>
                      {convo.agentMode
                        ? <Headphones className="h-2 w-2 text-white" />
                        : <Bot className="h-2 w-2 text-white" />}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className={cn(
                        "text-sm truncate",
                        urgent ? "font-semibold text-foreground" : "font-medium text-foreground"
                      )}>
                        {convo.visitorName ?? "Anonymous"}
                      </span>
                      <span className="text-[11px] text-muted-foreground flex-shrink-0">{timeAgo}</span>
                    </div>

                    <div className="flex items-center gap-1.5 mt-0.5">
                      {urgent && (
                        <span className="flex items-center gap-1 text-[11px] text-amber-400 font-medium">
                          <AlertTriangle className="h-3 w-3" />
                          Needs help
                        </span>
                      )}
                      {!urgent && (
                        <span className="text-[11px] text-muted-foreground truncate">
                          {convo.status === "closed"
                            ? "Closed"
                            : convo.agentMode
                            ? "You're handling"
                            : "AI handling"}
                          {convo.siteUrl && ` · ${(() => { try { return new URL(convo.siteUrl).hostname.replace("www.", ""); } catch { return ""; } })()}`}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

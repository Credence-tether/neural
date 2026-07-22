import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { useRef, useEffect, useState, useMemo } from "react";
import { Button } from "@/components/ui/button.tsx";
import { toast } from "sonner";
import { cn } from "@/lib/utils.ts";
import { format, isToday, isYesterday } from "date-fns";
import {
  Bot, User, Headphones, Send, UserCheck, X, AlertTriangle, Zap, Check,
} from "lucide-react";

type Props = { conversationId: Id<"conversations"> };

function dayLabel(ts: string) {
  const d = new Date(ts);
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  return format(d, "MMM d, yyyy");
}

export default function ConversationThread({ conversationId }: Props) {
  const messages = useQuery(api.messages.getMessages, { conversationId });
  const conversation = useQuery(api.conversations.getConversation, { conversationId });
  const cannedResponses = useQuery(api.cannedResponses.list);
  const sendMessage = useMutation(api.messages.sendMessage);
  const takeOver = useMutation(api.conversations.agentTakeOver);
  const agentLeave = useMutation(api.conversations.agentLeave);
  const closeConvo = useMutation(api.conversations.closeConversation);

  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [slashQuery, setSlashQuery] = useState<string | null>(null);
  const [slashIndex, setSlashIndex] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const sendingRef = useRef(false); // debounce guard — blocks double-fire

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages?.length]);

  // Auto-grow textarea
  const handleAutoGrow = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  };

  const filteredCanned = slashQuery !== null && cannedResponses
    ? cannedResponses.filter(
        (r) =>
          r.shortcut.includes(slashQuery.toLowerCase()) ||
          r.title.toLowerCase().includes(slashQuery.toLowerCase())
      )
    : [];

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setText(val);
    handleAutoGrow();
    const slashMatch = val.match(/(?:^|\s)\/(\S*)$/);
    if (slashMatch) { setSlashQuery(slashMatch[1]); setSlashIndex(0); }
    else setSlashQuery(null);
  };

  const insertCannedResponse = (content: string) => {
    const newText = text.replace(/(?:^|\s)\/\S*$/, (m) =>
      m.startsWith(" ") ? " " + content : content
    );
    setText(newText);
    setSlashQuery(null);
    textareaRef.current?.focus();
    requestAnimationFrame(handleAutoGrow);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (slashQuery !== null && filteredCanned.length > 0) {
      if (e.key === "ArrowDown") { e.preventDefault(); setSlashIndex(i => Math.min(i + 1, filteredCanned.length - 1)); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setSlashIndex(i => Math.max(i - 1, 0)); return; }
      if (e.key === "Tab" || e.key === "Enter") {
        e.preventDefault();
        const chosen = filteredCanned[slashIndex];
        if (chosen) insertCannedResponse(chosen.content);
        return;
      }
      if (e.key === "Escape") { setSlashQuery(null); return; }
    }
    if (e.key === "Enter" && !e.shiftKey && slashQuery === null) {
      e.preventDefault();
      void handleSend();
    }
  };

  const handleSend = async () => {
    if (!text.trim() || !conversation || sendingRef.current) return;
    sendingRef.current = true;
    setSending(true);
    const outgoing = text.trim();
    setText(""); // optimistic clear
    requestAnimationFrame(handleAutoGrow);
    try {
      await sendMessage({ conversationId, role: "agent", content: outgoing });
    } catch {
      setText(outgoing); // restore on failure
      toast.error("Message failed — tap send to retry");
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  };

  const handleTakeOver = async () => {
    try { await takeOver({ conversationId }); toast.success("You're now handling this chat"); }
    catch { toast.error("Couldn't take over"); }
  };
  const handleLeave = async () => {
    try { await agentLeave({ conversationId }); toast("AI resumed"); }
    catch { toast.error("Couldn't hand back"); }
  };
  const handleClose = async () => {
    try { await closeConvo({ conversationId }); toast.success("Chat closed"); }
    catch { toast.error("Couldn't close"); }
  };

  // Group messages by day for separators
  const grouped = useMemo(() => {
    if (!messages) return [];
    const out: { day: string; items: typeof messages }[] = [];
    for (const msg of messages) {
      const day = dayLabel(msg.timestamp);
      const last = out[out.length - 1];
      if (last && last.day === day) last.items.push(msg);
      else out.push({ day, items: [msg] });
    }
    return out;
  }, [messages]);

  if (!conversation || !messages) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  const isAgentMode = conversation.agentMode;
  const isClosed = conversation.status === "closed";

  return (
    <div className="flex flex-col h-full min-h-0">

      {/* ── Header ── */}
      <div className="flex items-center gap-3 px-3 md:px-4 py-2.5 border-b border-border flex-shrink-0">
        <div className="relative flex-shrink-0">
          <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center">
            <User className="h-4 w-4 text-primary" />
          </div>
          <div className={cn(
            "absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-background",
            isClosed ? "bg-muted-foreground/40" : isAgentMode ? "bg-emerald-500" : "bg-violet-500"
          )} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">
            {conversation.visitorName ?? "Anonymous"}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {isClosed ? "Closed" : isAgentMode ? "You're handling" : conversation.aiStruggling ? "AI needs help" : "AI handling"}
            {conversation.visitorEmail && ` · ${conversation.visitorEmail}`}
          </p>
        </div>
        {!isClosed && (
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {isAgentMode ? (
              <Button size="sm" variant="secondary" onClick={handleLeave} className="text-xs h-8 gap-1 px-2.5">
                <Bot className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">To AI</span>
              </Button>
            ) : (
              <Button size="sm" onClick={handleTakeOver} className="text-xs h-8 gap-1 px-2.5">
                <UserCheck className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Take over</span>
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={handleClose} className="text-xs h-8 w-8 p-0 text-muted-foreground hover:text-destructive">
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* ── Struggling banner ── */}
      {conversation.aiStruggling && !isAgentMode && !isClosed && (
        <button
          onClick={handleTakeOver}
          className="mx-3 mt-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/25 flex items-center gap-2 text-left cursor-pointer hover:bg-amber-500/15 transition-colors flex-shrink-0"
        >
          <AlertTriangle className="h-4 w-4 text-amber-400 flex-shrink-0" />
          <span className="text-xs text-amber-300 flex-1">AI is struggling — tap to take over</span>
          <UserCheck className="h-3.5 w-3.5 text-amber-400" />
        </button>
      )}

      {/* ── Messages ── */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch] px-3 md:px-4">
        <div className="py-3 space-y-4">
          {grouped.map(({ day, items }) => (
            <div key={day} className="space-y-2.5">
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-border" />
                <span className="text-[10px] font-medium text-muted-foreground/70 uppercase tracking-wider">{day}</span>
                <div className="flex-1 h-px bg-border" />
              </div>
              {items.map((msg) => {
                const isVisitor = msg.role === "visitor";
                const isAgent = msg.role === "agent";
                return (
                  <div key={msg._id} className={cn("flex", isVisitor ? "justify-start" : "justify-end")}>
                    <div className={cn("max-w-[85%] md:max-w-[70%]")}>
                      <div className={cn(
                        "px-3.5 py-2 rounded-2xl text-sm leading-relaxed break-words",
                        isVisitor
                          ? "bg-secondary text-foreground rounded-bl-md"
                          : isAgent
                          ? "bg-emerald-600 text-white rounded-br-md"
                          : "bg-primary/15 text-foreground border border-primary/20 rounded-br-md"
                      )}>
                        {msg.content}
                      </div>
                      <div className={cn(
                        "flex items-center gap-1 px-1 mt-0.5",
                        isVisitor ? "justify-start" : "justify-end"
                      )}>
                        {!isVisitor && (
                          isAgent
                            ? <Headphones className="h-2.5 w-2.5 text-emerald-500/60" />
                            : <Bot className="h-2.5 w-2.5 text-primary/50" />
                        )}
                        <span className="text-[10px] text-muted-foreground/50">
                          {format(new Date(msg.timestamp), "HH:mm")}
                          {isAgent && msg.agentName && ` · ${msg.agentName}`}
                        </span>
                        {!isVisitor && <Check className="h-2.5 w-2.5 text-muted-foreground/40" />}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        <div ref={bottomRef} className="h-1" />
      </div>

      {/* ── Composer ── */}
      {!isClosed && isAgentMode && (
        <div className="p-2.5 md:p-3 border-t border-border flex-shrink-0 relative bg-background pb-[max(0.625rem,env(safe-area-inset-bottom))]">
          {/* Canned dropdown */}
          {slashQuery !== null && filteredCanned.length > 0 && (
            <div className="absolute bottom-full left-2.5 right-2.5 mb-1 bg-popover border border-border rounded-xl shadow-xl overflow-hidden z-20">
              <div className="px-3 py-1.5 border-b border-border flex items-center gap-1.5">
                <Zap className="h-3 w-3 text-primary" />
                <span className="text-[11px] text-muted-foreground">Quick replies</span>
              </div>
              {filteredCanned.slice(0, 5).map((r, i) => (
                <button
                  key={r._id}
                  onClick={() => insertCannedResponse(r.content)}
                  className={cn(
                    "w-full text-left px-3 py-2.5 flex items-start gap-2.5 transition-colors cursor-pointer",
                    i === slashIndex ? "bg-primary/10" : "hover:bg-secondary/60"
                  )}
                >
                  <span className="text-[10px] mt-0.5 px-1.5 py-0.5 rounded bg-primary/15 text-primary font-mono flex-shrink-0">
                    /{r.shortcut}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-foreground">{r.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{r.content}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          <div className="flex gap-2 items-end">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={handleTextChange}
              onKeyDown={handleKeyDown}
              placeholder="Reply… ( / for quick replies)"
              rows={1}
              className="flex-1 resize-none text-sm bg-secondary border border-border rounded-2xl px-3.5 py-2.5 outline-none focus:border-primary/50 transition-colors leading-relaxed max-h-[120px] text-foreground placeholder:text-muted-foreground/60"
              style={{ height: "auto" }}
            />
            <button
              onClick={() => void handleSend()}
              disabled={!text.trim() || sending}
              className={cn(
                "h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all cursor-pointer",
                text.trim() && !sending
                  ? "bg-primary text-primary-foreground hover:opacity-90 active:scale-95"
                  : "bg-secondary text-muted-foreground/40"
              )}
              aria-label="Send"
            >
              <Send className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>
      )}

      {/* ── AI handling footer ── */}
      {!isClosed && !isAgentMode && (
        <div className="p-2.5 md:p-3 border-t border-border flex-shrink-0 pb-[max(0.625rem,env(safe-area-inset-bottom))]">
          <button
            onClick={handleTakeOver}
            className="w-full flex items-center justify-center gap-2 px-3 py-3 rounded-xl bg-secondary/60 border border-border hover:bg-secondary hover:border-primary/30 transition-colors cursor-pointer"
          >
            <Bot className="h-4 w-4 text-primary" />
            <span className="text-sm text-muted-foreground">AI is replying — <span className="text-primary font-medium">tap to take over</span></span>
          </button>
        </div>
      )}

      {isClosed && (
        <div className="p-3 border-t border-border flex-shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <p className="text-xs text-center text-muted-foreground">This conversation is closed</p>
        </div>
      )}
    </div>
  );
}

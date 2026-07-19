import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { useRef, useEffect, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { toast } from "sonner";
import { cn } from "@/lib/utils.ts";
import { format } from "date-fns";
import {
  Bot, User, Headphones, Send, UserCheck, X, Cpu, AlertTriangle, Zap,
} from "lucide-react";

type Props = {
  conversationId: Id<"conversations">;
};

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

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
    const slashMatch = val.match(/(?:^|\s)\/(\S*)$/);
    if (slashMatch) {
      setSlashQuery(slashMatch[1]);
      setSlashIndex(0);
    } else {
      setSlashQuery(null);
    }
  };

  const insertCannedResponse = (content: string) => {
    const newText = text.replace(/(?:^|\s)\/\S*$/, (m) =>
      m.startsWith(" ") ? " " + content : content
    );
    setText(newText);
    setSlashQuery(null);
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (slashQuery !== null && filteredCanned.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSlashIndex((i) => Math.min(i + 1, filteredCanned.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSlashIndex((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === "Tab" || e.key === "Enter") {
        e.preventDefault();
        const chosen = filteredCanned[slashIndex];
        if (chosen) insertCannedResponse(chosen.content);
        return;
      }
      if (e.key === "Escape") {
        setSlashQuery(null);
        return;
      }
    }

    if (e.key === "Enter" && !e.shiftKey && slashQuery === null) {
      e.preventDefault();
      void handleSend();
    }
  };

  const handleSend = async () => {
    if (!text.trim() || !conversation) return;
    setSending(true);
    try {
      await sendMessage({ conversationId, role: "agent", content: text.trim() });
      setText("");
    } catch {
      toast.error("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const handleTakeOver = async () => {
    try {
      await takeOver({ conversationId });
      toast.success("You've taken over this conversation");
    } catch {
      toast.error("Failed to take over");
    }
  };

  const handleLeave = async () => {
    try {
      await agentLeave({ conversationId });
      toast("AI has resumed the conversation");
    } catch {
      toast.error("Failed to leave");
    }
  };

  const handleClose = async () => {
    try {
      await closeConvo({ conversationId });
      toast.success("Conversation closed");
    } catch {
      toast.error("Failed to close");
    }
  };

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
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center">
            <User className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">
              {conversation.visitorName ?? "Anonymous Visitor"}
            </p>
            <div className="flex items-center gap-2">
              {conversation.visitorEmail && (
                <span className="text-xs text-muted-foreground">{conversation.visitorEmail}</span>
              )}
              <span className={cn(
                "text-xs px-1.5 py-0.5 rounded border",
                isAgentMode
                  ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                  : conversation.aiStruggling
                  ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                  : "bg-violet-500/15 text-violet-400 border-violet-500/30"
              )}>
                {isAgentMode ? "Agent mode" : conversation.aiStruggling ? "AI struggling" : "AI handling"}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isClosed && (
            <>
              {isAgentMode ? (
                <Button size="sm" variant="secondary" onClick={handleLeave} className="text-xs h-7 gap-1">
                  <Bot className="h-3 w-3" /> Return to AI
                </Button>
              ) : (
                <Button size="sm" onClick={handleTakeOver} className="text-xs h-7 gap-1">
                  <UserCheck className="h-3 w-3" /> Take Over
                </Button>
              )}
              <Button size="sm" variant="secondary" onClick={handleClose} className="text-xs h-7 gap-1">
                <X className="h-3 w-3" /> Close
              </Button>
            </>
          )}
        </div>
      </div>

      {conversation.aiStruggling && !isAgentMode && (
        <div className="mx-4 mt-3 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-400 flex-shrink-0" />
          <p className="text-xs text-amber-300">AI is struggling with this conversation. Consider taking over.</p>
        </div>
      )}

      <ScrollArea className="flex-1 px-4 py-3">
        <div className="space-y-3">
          {messages.map((msg) => {
            const isVisitor = msg.role === "visitor";
            const isAgent = msg.role === "agent";
            const isAi = msg.role === "ai";
            return (
              <div key={msg._id} className={cn("flex gap-2", isVisitor ? "justify-start" : "justify-end")}>
                {isVisitor && (
                  <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 mt-1">
                    <User className="h-3 w-3 text-muted-foreground" />
                  </div>
                )}
                <div className="max-w-[70%] space-y-1">
                  <div className={cn(
                    "px-3 py-2 rounded-xl text-sm leading-relaxed",
                    isVisitor
                      ? "bg-secondary text-foreground rounded-tl-none"
                      : isAgent
                      ? "bg-emerald-600 text-white rounded-tr-none"
                      : "bg-primary/20 text-foreground rounded-tr-none border border-primary/20"
                  )}>
                    {msg.content}
                  </div>
                  <div className={cn("flex items-center gap-1 px-1", isVisitor ? "justify-start" : "justify-end")}>
                    {isAi && <Cpu className="h-2.5 w-2.5 text-muted-foreground/60" />}
                    {isAgent && <Headphones className="h-2.5 w-2.5 text-emerald-500/60" />}
                    <span className="text-xs text-muted-foreground/50">
                      {format(new Date(msg.timestamp), "HH:mm")}
                      {isAgent && msg.agentName && ` · ${msg.agentName}`}
                      {isAi && msg.aiProvider && ` · ${msg.aiProvider}`}
                    </span>
                  </div>
                </div>
                {!isVisitor && (
                  <div className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-1",
                    isAgent ? "bg-emerald-600/20" : "bg-primary/15"
                  )}>
                    {isAgent ? <Headphones className="h-3 w-3 text-emerald-400" /> : <Bot className="h-3 w-3 text-primary" />}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div ref={bottomRef} />
      </ScrollArea>

      {!isClosed && isAgentMode && (
        <div className="p-3 border-t border-border flex-shrink-0 relative">
          {slashQuery !== null && filteredCanned.length > 0 && (
            <div className="absolute bottom-full left-3 right-3 mb-1 bg-popover border border-border rounded-xl shadow-xl overflow-hidden z-20">
              <div className="px-3 py-1.5 border-b border-border flex items-center gap-1.5">
                <Zap className="h-3 w-3 text-primary" />
                <span className="text-xs text-muted-foreground">
                  Canned responses · <kbd className="text-[10px] bg-secondary px-1 rounded">↑↓</kbd> navigate · <kbd className="text-[10px] bg-secondary px-1 rounded">Tab</kbd> insert
                </span>
              </div>
              {filteredCanned.slice(0, 6).map((r, i) => (
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
          {slashQuery !== null && filteredCanned.length === 0 && slashQuery.length > 0 && (
            <div className="absolute bottom-full left-3 right-3 mb-1 bg-popover border border-border rounded-xl shadow-xl px-3 py-2.5 z-20">
              <p className="text-xs text-muted-foreground">No canned responses matching <span className="text-foreground font-mono">/{slashQuery}</span></p>
            </div>
          )}

          <div className="flex gap-2 items-end">
            <div className="flex-1 relative">
              <Textarea
                ref={textareaRef}
                value={text}
                onChange={handleTextChange}
                onKeyDown={handleKeyDown}
                placeholder="Type your reply… or / for canned responses"
                className="resize-none text-sm min-h-[60px] max-h-[120px] bg-secondary border-border pr-3"
                rows={2}
              />
            </div>
            <Button
              size="sm"
              onClick={handleSend}
              disabled={!text.trim() || sending}
              className="h-10 w-10 p-0 flex-shrink-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground/50 mt-1 px-1">
            Enter to send · Shift+Enter for new line · / for quick replies
          </p>
        </div>
      )}

      {!isClosed && !isAgentMode && (
        <div className="p-3 border-t border-border flex-shrink-0">
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-secondary/50 border border-border">
            <Bot className="h-4 w-4 text-primary flex-shrink-0" />
            <p className="text-xs text-muted-foreground">AI is handling this conversation. Take over to send messages.</p>
          </div>
        </div>
      )}

      {isClosed && (
        <div className="p-3 border-t border-border flex-shrink-0">
          <p className="text-xs text-center text-muted-foreground">This conversation is closed</p>
        </div>
      )}
    </div>
  );
}

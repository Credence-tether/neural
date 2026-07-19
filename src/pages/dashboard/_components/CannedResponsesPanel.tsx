import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { useState } from "react";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Label } from "@/components/ui/label.tsx";
import { ScrollArea } from "@/components/ui/scroll-area.tsx";
import { toast } from "sonner";
import { cn } from "@/lib/utils.ts";
import { Plus, Pencil, Trash2, Zap, X, Check } from "lucide-react";

type CannedResponse = {
  _id: Id<"cannedResponses">;
  title: string;
  shortcut: string;
  content: string;
};

function ResponseForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: CannedResponse;
  onSave: (data: { title: string; shortcut: string; content: string }) => Promise<void>;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [shortcut, setShortcut] = useState(initial?.shortcut ?? "");
  const [content, setContent] = useState(initial?.content ?? "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim() || !shortcut.trim() || !content.trim()) {
      toast.error("All fields are required");
      return;
    }
    setSaving(true);
    try {
      await onSave({ title, shortcut, content });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3 p-4 bg-secondary/40 rounded-xl border border-border">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Title</Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Greeting"
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Shortcut</Label>
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">/</span>
            <Input
              value={shortcut}
              onChange={(e) => setShortcut(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
              placeholder="greeting"
              className="h-8 text-sm pl-6"
            />
          </div>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Response text</Label>
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Type the canned response message..."
          className="text-sm min-h-[80px] max-h-[140px] resize-none"
          rows={3}
        />
      </div>
      <div className="flex gap-2 justify-end">
        <Button size="sm" variant="secondary" onClick={onCancel} className="h-7 text-xs gap-1">
          <X className="h-3 w-3" /> Cancel
        </Button>
        <Button size="sm" onClick={handleSave} disabled={saving} className="h-7 text-xs gap-1">
          <Check className="h-3 w-3" /> {saving ? "Saving…" : "Save"}
        </Button>
      </div>
    </div>
  );
}

export default function CannedResponsesPanel() {
  const responses = useQuery(api.cannedResponses.list);
  const createFn = useMutation(api.cannedResponses.create);
  const updateFn = useMutation(api.cannedResponses.update);
  const removeFn = useMutation(api.cannedResponses.remove);

  const [showNew, setShowNew] = useState(false);
  const [editingId, setEditingId] = useState<Id<"cannedResponses"> | null>(null);

  const handleCreate = async (data: { title: string; shortcut: string; content: string }) => {
    try {
      await createFn(data);
      setShowNew(false);
      toast.success("Canned response saved");
    } catch {
      toast.error("Failed to save");
    }
  };

  const handleUpdate = async (
    id: Id<"cannedResponses">,
    data: { title: string; shortcut: string; content: string }
  ) => {
    try {
      await updateFn({ id, ...data });
      setEditingId(null);
      toast.success("Updated");
    } catch {
      toast.error("Failed to update");
    }
  };

  const handleDelete = async (id: Id<"cannedResponses">) => {
    try {
      await removeFn({ id });
      toast.success("Deleted");
    } catch {
      toast.error("Failed to delete");
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Canned Responses</h3>
          <p className="text-xs text-muted-foreground">Type / in any chat to use</p>
        </div>
        <Button size="sm" onClick={() => { setShowNew(true); setEditingId(null); }} className="h-7 text-xs gap-1">
          <Plus className="h-3 w-3" /> New
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {showNew && (
            <ResponseForm
              onSave={handleCreate}
              onCancel={() => setShowNew(false)}
            />
          )}

          {!responses ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 rounded-xl bg-secondary/40 animate-pulse" />
            ))
          ) : responses.length === 0 && !showNew ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Zap className="h-5 w-5 text-primary/40" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">No canned responses yet</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Create templates to reply faster in chats
                </p>
              </div>
              <Button size="sm" onClick={() => setShowNew(true)} className="text-xs gap-1">
                <Plus className="h-3 w-3" /> Create first response
              </Button>
            </div>
          ) : (
            responses.map((r) =>
              editingId === r._id ? (
                <ResponseForm
                  key={r._id}
                  initial={r}
                  onSave={(data) => handleUpdate(r._id, data)}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <div
                  key={r._id}
                  className="group flex gap-3 p-3 rounded-xl border border-border bg-card hover:border-primary/30 transition-colors"
                >
                  <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Zap className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-semibold text-foreground">{r.title}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-mono">
                        /{r.shortcut}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{r.content}</p>
                  </div>
                  <div className={cn(
                    "flex gap-1 flex-shrink-0 transition-opacity",
                    "opacity-0 group-hover:opacity-100"
                  )}>
                    <button
                      onClick={() => { setEditingId(r._id); setShowNew(false); }}
                      className="p-1.5 rounded hover:bg-secondary transition-colors cursor-pointer"
                    >
                      <Pencil className="h-3 w-3 text-muted-foreground" />
                    </button>
                    <button
                      onClick={() => void handleDelete(r._id)}
                      className="p-1.5 rounded hover:bg-destructive/10 transition-colors cursor-pointer"
                    >
                      <Trash2 className="h-3 w-3 text-destructive/70" />
                    </button>
                  </div>
                </div>
              )
            )
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

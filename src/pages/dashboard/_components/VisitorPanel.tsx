import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { User } from "lucide-react";
import VisitorDetailCard from "./VisitorDetailCard.tsx";

type Props = {
  conversationId: Id<"conversations"> | null;
  visitorId?: Id<"visitors"> | null;
};

export default function VisitorPanel({ conversationId, visitorId }: Props) {
  // Explicit visitorId (e.g. clicked from the Live Visitors list) takes priority
  // over deriving the visitor from the selected conversation.
  const conversation = useQuery(
    api.conversations.getConversation,
    !visitorId && conversationId ? { conversationId } : "skip"
  );
  const visitorViaConvo = useQuery(
    api.visitors.getVisitorBySession,
    !visitorId && conversation?.sessionId ? { sessionId: conversation.sessionId } : "skip"
  );
  const visitorViaId = useQuery(
    api.visitors.getVisitorById,
    visitorId ? { visitorId } : "skip"
  );
  const visitor = visitorId ? visitorViaId : visitorViaConvo;

  const pageViews = useQuery(
    api.visitors.getVisitorPageViews,
    visitor ? { visitorId: visitor._id } : "skip"
  );

  if (!conversationId && !visitorId) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3 p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center">
          <User className="h-6 w-6 text-muted-foreground/40" />
        </div>
        <p className="text-sm text-muted-foreground">Select a conversation</p>
        <p className="text-xs text-muted-foreground/60">Visitor details will appear here</p>
      </div>
    );
  }

  if (!visitor) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return <VisitorDetailCard visitor={visitor} pageViews={pageViews} />;
}

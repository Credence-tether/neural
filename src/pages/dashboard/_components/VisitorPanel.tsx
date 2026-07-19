import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { formatDistanceToNow, format } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import {
  MapPin, Monitor, Globe, Clock, Navigation, User,
  Mail, Smartphone
} from "lucide-react";

type Props = {
  conversationId: Id<"conversations"> | null;
};

export default function VisitorPanel({ conversationId }: Props) {
  const conversation = useQuery(
    api.conversations.getConversation,
    conversationId ? { conversationId } : "skip"
  );
  const visitor = useQuery(
    api.visitors.getVisitorBySession,
    conversation?.sessionId ? { sessionId: conversation.sessionId } : "skip"
  );
  const pageViews = useQuery(
    api.visitors.getVisitorPageViews,
    visitor ? { visitorId: visitor._id } : "skip"
  );

  if (!conversationId) {
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

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-5">
        {/* Visitor identity */}
        <div>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                {visitor.name ?? "Anonymous Visitor"}
              </p>
              <div className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${visitor.isOnline ? "bg-emerald-400" : "bg-muted-foreground/40"}`} />
                <span className="text-xs text-muted-foreground">
                  {visitor.isOnline
                    ? "Online now"
                    : `Last seen ${formatDistanceToNow(new Date(visitor.lastSeen), { addSuffix: true })}`}
                </span>
              </div>
            </div>
          </div>

          {visitor.email && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground py-2 border-b border-border">
              <Mail className="h-3.5 w-3.5" />
              <span>{visitor.email}</span>
            </div>
          )}
        </div>

        {/* Location */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Location</p>
          <div className="space-y-1.5">
            {(visitor.city || visitor.country) && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                <span className="text-foreground">
                  {[visitor.city, visitor.country].filter(Boolean).join(", ")}
                </span>
              </div>
            )}
            {visitor.ip && (
              <div className="flex items-center gap-2 text-sm">
                <Globe className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                <span className="text-muted-foreground font-mono text-xs">{visitor.ip}</span>
              </div>
            )}
            {!visitor.city && !visitor.country && !visitor.ip && (
              <p className="text-xs text-muted-foreground/60">Location not available</p>
            )}
          </div>
        </div>

        {/* Current page */}
        {visitor.currentPage && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Current Page</p>
            <div className="px-3 py-2 rounded-lg bg-secondary/60 border border-border">
              <div className="flex items-center gap-2 mb-1">
                <Navigation className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                <span className="text-xs text-foreground font-medium">{visitor.currentPageTitle ?? "Unknown"}</span>
              </div>
              <p className="text-xs text-muted-foreground font-mono truncate">{visitor.currentPage}</p>
            </div>
          </div>
        )}

        {/* Device */}
        {visitor.userAgent && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Device</p>
            <div className="flex items-start gap-2">
              <Monitor className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground leading-relaxed">{visitor.userAgent}</p>
            </div>
          </div>
        )}

        {/* Page journey */}
        {pageViews && pageViews.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Page Journey ({pageViews.length})
            </p>
            <div className="space-y-2">
              {pageViews.slice(0, 10).map((pv, i) => (
                <div key={pv._id} className="flex items-start gap-2">
                  <div className="flex flex-col items-center flex-shrink-0 pt-0.5">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${i === 0 ? "bg-primary" : "bg-muted-foreground/30"}`} />
                    {i < pageViews.length - 1 && (
                      <div className="w-px h-4 bg-border mt-1" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 pb-1">
                    <p className="text-xs text-foreground truncate">{pv.title ?? pv.url}</p>
                    <p className="text-xs text-muted-foreground/60">
                      {format(new Date(pv.timestamp), "HH:mm:ss")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Session info */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Session</p>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              <span>Started {formatDistanceToNow(new Date(visitor._creationTime), { addSuffix: true })}</span>
            </div>
            {visitor.siteUrl && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Globe className="h-3.5 w-3.5" />
                <span className="truncate">{visitor.siteUrl}</span>
              </div>
            )}
            {visitor.referrer && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Navigation className="h-3.5 w-3.5" />
                <span className="truncate">From: {visitor.referrer}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}

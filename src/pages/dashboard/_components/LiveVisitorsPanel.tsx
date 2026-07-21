import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { ScrollArea } from "@/components/ui/scroll-area.tsx";
import { MapPin, Navigation, User, ArrowLeft } from "lucide-react";
import VisitorDetailCard from "./VisitorDetailCard.tsx";

type Props = {
  onSelect?: (id: Id<"visitors">) => void;
};

export default function LiveVisitorsPanel({ onSelect }: Props = {}) {
  const visitors = useQuery(api.visitors.getOnlineVisitors);
  const [selectedVisitorId, setSelectedVisitorId] = useState<Id<"visitors"> | null>(null);

  const selectedVisitor = useQuery(
    api.visitors.getVisitorById,
    selectedVisitorId ? { visitorId: selectedVisitorId } : "skip"
  );
  const pageViews = useQuery(
    api.visitors.getVisitorPageViews,
    selectedVisitorId ? { visitorId: selectedVisitorId } : "skip"
  );

  const handleClick = (id: Id<"visitors">) => {
    if (onSelect) {
      // Delegate to parent (e.g. show in a separate Visitor Details tab)
      onSelect(id);
    } else {
      // No parent handler — show the detail view inline within this panel
      setSelectedVisitorId(id);
    }
  };

  // Detail view for a single visitor, clicked in from the list below.
  // Only used in standalone mode (no onSelect passed in).
  if (!onSelect && selectedVisitorId) {
    return (
      <div className="h-full flex flex-col">
        <div className="px-3 py-2.5 border-b border-border flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => setSelectedVisitorId(null)}
            className="p-1.5 rounded hover:bg-secondary transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-semibold text-foreground">Visitor Details</span>
        </div>
        {!selectedVisitor ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        ) : (
          <VisitorDetailCard visitor={selectedVisitor} pageViews={pageViews} />
        )}
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-3 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-sm font-semibold text-foreground">Live Visitors</span>
          {visitors && (
            <span className="ml-auto text-xs px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
              {visitors.length}
            </span>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {!visitors && (
            <div className="flex items-center justify-center py-8">
              <div className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            </div>
          )}
          {visitors?.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 gap-2 text-center px-4">
              <User className="h-6 w-6 text-muted-foreground/30" />
              <p className="text-xs text-muted-foreground">No visitors online</p>
            </div>
          )}
          {visitors?.map((v) => (
            <button
              key={v._id}
              onClick={() => handleClick(v._id)}
              className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-secondary transition-colors cursor-pointer"
            >
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 mt-0.5">
                  <User className="h-3 w-3 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">
                    {v.name ?? "Anonymous"}
                  </p>
                  {v.currentPage && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <Navigation className="h-2.5 w-2.5 text-muted-foreground/60" />
                      <p className="text-xs text-muted-foreground/60 truncate">{v.currentPageTitle ?? v.currentPage}</p>
                    </div>
                  )}
                  <div className="flex items-center gap-1 mt-0.5">
                    <MapPin className="h-2.5 w-2.5 text-muted-foreground/40" />
                    <p className="text-xs text-muted-foreground/40">
                      {v.city || v.country
                        ? [v.city, v.country].filter(Boolean).join(", ")
                        : "Locating…"}
                    </p>
                  </div>
                </div>
                <div className="flex-shrink-0">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5" />
                </div>
              </div>
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { MapPin, Navigation, User, ArrowLeft } from "lucide-react";
import { countryFlagEmoji } from "@/lib/utils.ts";
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
    if (onSelect) onSelect(id);
    else setSelectedVisitorId(id);
  };

  if (!onSelect && selectedVisitorId) {
    return (
      <div className="h-full flex flex-col min-h-0">
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
    <div className="h-full flex flex-col min-h-0">
      <div className="px-4 py-3 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-sm font-semibold text-foreground">Live now</span>
          {visitors && (
            <span className="ml-auto text-xs px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 font-medium">
              {visitors.length}
            </span>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          Active on your site in the last 2 minutes
        </p>
      </div>

      {/* Native scroll — reliable touch scrolling on every device */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
        <div className="p-2 space-y-1">
          {!visitors && (
            <div className="flex items-center justify-center py-8">
              <div className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            </div>
          )}
          {visitors?.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 gap-2 text-center px-4">
              <User className="h-6 w-6 text-muted-foreground/30" />
              <p className="text-xs text-muted-foreground">Nobody on the site right now</p>
              <p className="text-[11px] text-muted-foreground/60">Visitors appear the moment they load a page</p>
            </div>
          )}
          {visitors?.map((v) => (
            <button
              key={v._id}
              onClick={() => handleClick(v._id)}
              className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-secondary active:bg-secondary transition-colors cursor-pointer"
            >
              <div className="flex items-start gap-2">
                <div className="relative flex-shrink-0 mt-0.5">
                  <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center">
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-background" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">
                    {v.name ?? "Anonymous"}
                  </p>
                  {v.currentPageTitle && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <Navigation className="h-2.5 w-2.5 text-muted-foreground/60 flex-shrink-0" />
                      <p className="text-[11px] text-muted-foreground/70 truncate">
                        {v.currentPageTitle.split("|")[0].trim()}
                      </p>
                    </div>
                  )}
                  {(v.city || v.country) && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <MapPin className="h-2.5 w-2.5 text-muted-foreground/40 flex-shrink-0" />
                      <p className="text-[11px] text-muted-foreground/50 truncate">
                        {countryFlagEmoji(v.countryCode) && (
                          <span className="mr-1">{countryFlagEmoji(v.countryCode)}</span>
                        )}
                        {[v.city, v.country].filter(Boolean).join(", ")}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { formatDistanceToNow } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area.tsx";
import { MapPin, Globe, Navigation, User } from "lucide-react";

export default function LiveVisitorsPanel() {
  const visitors = useQuery(api.visitors.getOnlineVisitors);

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
            <div
              key={v._id}
              className="px-3 py-2.5 rounded-lg hover:bg-secondary transition-colors"
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
                  {(v.city || v.country) && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <MapPin className="h-2.5 w-2.5 text-muted-foreground/40" />
                      <p className="text-xs text-muted-foreground/40">
                        {[v.city, v.country].filter(Boolean).join(", ")}
                      </p>
                    </div>
                  )}
                </div>
                <div className="flex-shrink-0">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

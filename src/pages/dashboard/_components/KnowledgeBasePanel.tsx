import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { ScrollArea } from "@/components/ui/scroll-area.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Globe, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { useAction, useMutation } from "convex/react";
import { formatDistanceToNow } from "date-fns";

export default function KnowledgeBasePanel() {
  const [siteUrl, setSiteUrl] = useState("");
  const [crawling, setCrawling] = useState(false);
  const crawlSite = useAction(api.ai.crawlAndEmbed);
  const deleteKB = useMutation(api.knowledge.deleteKnowledgeBase);
  const [queriedSite, setQueriedSite] = useState<string | null>(null);
  const crawlJobs = useQuery(
    api.knowledge.getCrawlJobs,
    queriedSite ? { siteUrl: queriedSite } : "skip"
  );
  const chunks = useQuery(
    api.knowledge.getKnowledgeChunks,
    queriedSite ? { siteUrl: queriedSite } : "skip"
  );

  const handleCrawl = async () => {
    if (!siteUrl.trim()) return;
    const url = siteUrl.trim().startsWith("http") ? siteUrl.trim() : `https://${siteUrl.trim()}`;
    setCrawling(true);
    setQueriedSite(url);
    try {
      await crawlSite({ siteUrl: url });
      toast.success("Site crawled and embedded successfully!");
    } catch (e) {
      toast.error("Crawl failed. Check your Firecrawl API key in Secrets.");
    } finally {
      setCrawling(false);
    }
  };

  const handleDelete = async () => {
    if (!queriedSite) return;
    try {
      await deleteKB({ siteUrl: queriedSite });
      toast.success("Knowledge base cleared");
    } catch {
      toast.error("Failed to delete");
    }
  };

  return (
    <div className="h-full flex flex-col p-4 gap-4">
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-1">Knowledge Base</h3>
        <p className="text-xs text-muted-foreground">
          Crawl a website so the AI can answer questions accurately about its content.
        </p>
      </div>

      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Website URL to crawl</Label>
        <div className="flex gap-2">
          <Input
            placeholder="https://yoursite.com"
            value={siteUrl}
            onChange={(e) => setSiteUrl(e.target.value)}
            className="text-sm bg-secondary border-border"
          />
          <Button
            onClick={handleCrawl}
            disabled={!siteUrl.trim() || crawling}
            size="sm"
            className="flex-shrink-0"
          >
            {crawling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4" />}
          </Button>
        </div>
        {queriedSite && chunks !== undefined && (
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {chunks.length} knowledge chunks indexed
            </p>
            {chunks.length > 0 && (
              <Button
                size="sm"
                variant="secondary"
                onClick={handleDelete}
                className="h-6 text-xs gap-1 text-destructive"
              >
                <Trash2 className="h-3 w-3" />
                Clear
              </Button>
            )}
          </div>
        )}
      </div>

      {crawlJobs && crawlJobs.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Recent Jobs</p>
          <div className="space-y-1.5">
            {crawlJobs.map((job) => (
              <div key={job._id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/50 border border-border">
                {job.status === "completed" && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />}
                {job.status === "running" && <Loader2 className="h-3.5 w-3.5 text-primary animate-spin flex-shrink-0" />}
                {job.status === "pending" && <Clock className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />}
                {job.status === "failed" && <AlertCircle className="h-3.5 w-3.5 text-destructive flex-shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-foreground capitalize">{job.status}</p>
                  {job.pagesCrawled !== undefined && (
                    <p className="text-xs text-muted-foreground">{job.pagesCrawled} pages</p>
                  )}
                </div>
                <span className="text-xs text-muted-foreground flex-shrink-0">
                  {formatDistanceToNow(new Date(job.startedAt), { addSuffix: true })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

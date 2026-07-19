import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { cn } from "@/lib/utils.ts";
import {
  MessageSquare, Bot, UserCheck, ArrowRightLeft,
  Clock, TrendingUp, Globe, Users,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell,
} from "recharts";

type Range = "7d" | "30d";

const STATUS_LABELS: Record<string, string> = {
  open: "Open",
  ai_handling: "AI Handling",
  agent_handling: "Agent Handling",
  waiting_agent: "Waiting Agent",
  closed: "Closed",
};

const STATUS_COLORS: Record<string, string> = {
  open: "#6366f1",
  ai_handling: "#818cf8",
  agent_handling: "#34d399",
  waiting_agent: "#f59e0b",
  closed: "#6b7280",
};

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground font-medium">{label}</span>
        <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", accent ?? "bg-primary/10")}>
          <Icon className={cn("h-3.5 w-3.5", accent ? "text-white" : "text-primary")} />
        </div>
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover border border-border rounded-lg px-3 py-2 text-xs shadow-lg">
      <p className="text-muted-foreground mb-0.5">{label}</p>
      <p className="font-semibold text-foreground">{payload[0].value} conversations</p>
    </div>
  );
}

function formatHour(h: number) {
  if (h === 0) return "12am";
  if (h === 12) return "12pm";
  return h < 12 ? `${h}am` : `${h - 12}pm`;
}

function formatMs(ms: number) {
  if (ms === 0) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function AnalyticsPanel() {
  const [range, setRange] = useState<Range>("7d");
  const data = useQuery(api.analytics.getAnalytics, { range });

  const aiRate =
    data && data.totalConversations > 0
      ? Math.round((data.aiResolved / data.totalConversations) * 100)
      : 0;

  const maxBusyCount = data ? Math.max(...data.busyHours.map((h) => h.count), 1) : 1;

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Analytics</h2>
          <p className="text-xs text-muted-foreground">Performance overview</p>
        </div>
        <div className="flex gap-1 p-0.5 bg-muted rounded-lg">
          {(["7d", "30d"] as Range[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={cn(
                "px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer",
                range === r
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {r === "7d" ? "7 days" : "30 days"}
            </button>
          ))}
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* Stat cards */}
        {!data ? (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <StatCard icon={MessageSquare} label="Total Conversations" value={data.totalConversations} sub={`${range} period`} />
            <StatCard icon={TrendingUp} label="Active Now" value={data.activeNow} sub="not yet closed" accent="bg-emerald-500" />
            <StatCard icon={Bot} label="AI Resolved" value={data.aiResolved} sub={`${aiRate}% resolution rate`} accent="bg-indigo-500" />
            <StatCard icon={UserCheck} label="Agent Resolved" value={data.agentResolved} sub="human-handled" accent="bg-violet-500" />
            <StatCard icon={ArrowRightLeft} label="Handoffs" value={data.handoffCount} sub="AI → human escalations" />
            <StatCard icon={Clock} label="Avg Response" value={formatMs(data.avgResponseTimeMs)} sub="AI first reply" />
          </div>
        )}

        {/* Volume chart */}
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-semibold text-foreground">Conversation Volume</span>
          </div>
          {!data ? (
            <Skeleton className="h-36 w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={140}>
              <AreaChart data={data.volumeByDay} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="volGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDate}
                  tick={{ fontSize: 10, fill: "#6b7280" }}
                  tickLine={false}
                  axisLine={false}
                  interval={range === "7d" ? 0 : 4}
                />
                <YAxis tick={{ fontSize: 10, fill: "#6b7280" }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#6366f1"
                  strokeWidth={2}
                  fill="url(#volGrad)"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Busy hours heatmap */}
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-semibold text-foreground">Busiest Hours</span>
            <span className="text-xs text-muted-foreground ml-auto">local time</span>
          </div>
          {!data ? (
            <Skeleton className="h-10 w-full" />
          ) : (
            <div className="flex gap-0.5 items-end h-12">
              {data.busyHours.map(({ hour, count }) => {
                const intensity = count / maxBusyCount;
                return (
                  <div key={hour} className="flex-1 flex flex-col items-center gap-1 group relative">
                    <div
                      className="w-full rounded-sm transition-all"
                      style={{
                        height: `${Math.max(4, intensity * 40)}px`,
                        background: `oklch(0.65 0.22 265 / ${0.15 + intensity * 0.85})`,
                      }}
                    />
                    {/* Tooltip on hover */}
                    <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col items-center pointer-events-none z-10">
                      <div className="bg-popover border border-border rounded px-1.5 py-0.5 text-xs whitespace-nowrap shadow">
                        {formatHour(hour)}: {count}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {data && (
            <div className="flex justify-between mt-1">
              <span className="text-[10px] text-muted-foreground">12am</span>
              <span className="text-[10px] text-muted-foreground">6am</span>
              <span className="text-[10px] text-muted-foreground">12pm</span>
              <span className="text-[10px] text-muted-foreground">6pm</span>
              <span className="text-[10px] text-muted-foreground">11pm</span>
            </div>
          )}
        </div>

        {/* Two-col: Status breakdown + Top countries */}
        <div className="grid grid-cols-2 gap-3">
          {/* Status breakdown */}
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <MessageSquare className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-semibold text-foreground">By Status</span>
            </div>
            {!data ? (
              <Skeleton className="h-24 w-full" />
            ) : data.statusBreakdown.length === 0 ? (
              <p className="text-xs text-muted-foreground">No data yet</p>
            ) : (
              <div className="space-y-2">
                {data.statusBreakdown
                  .sort((a, b) => b.count - a.count)
                  .map(({ status, count }) => {
                    const pct = data.totalConversations > 0 ? (count / data.totalConversations) * 100 : 0;
                    return (
                      <div key={status}>
                        <div className="flex justify-between mb-0.5">
                          <span className="text-[11px] text-muted-foreground">{STATUS_LABELS[status] ?? status}</span>
                          <span className="text-[11px] font-medium text-foreground">{count}</span>
                        </div>
                        <div className="h-1 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${pct}%`, background: STATUS_COLORS[status] ?? "#6366f1" }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          {/* Top countries */}
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Globe className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-semibold text-foreground">Top Countries</span>
            </div>
            {!data ? (
              <Skeleton className="h-24 w-full" />
            ) : data.topCountries.length === 0 ? (
              <p className="text-xs text-muted-foreground">No geo data yet</p>
            ) : (
              <div className="space-y-2">
                {data.topCountries.slice(0, 5).map(({ country, count }) => {
                  const max = data.topCountries[0]?.count ?? 1;
                  return (
                    <div key={country}>
                      <div className="flex justify-between mb-0.5">
                        <span className="text-[11px] text-muted-foreground truncate">{country}</span>
                        <span className="text-[11px] font-medium text-foreground ml-2">{count}</span>
                      </div>
                      <div className="h-1 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${(count / max) * 100}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Resolved today highlight */}
        {data && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <Users className="h-4 w-4 text-emerald-400 flex-shrink-0" />
            <div>
              <p className="text-xs font-semibold text-emerald-400">{data.resolvedToday} resolved today</p>
              <p className="text-xs text-muted-foreground">
                {data.aiResolved} AI-only · {data.agentResolved} agent-assisted
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

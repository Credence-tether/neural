import { RateLimiter, MINUTE } from "@convex-dev/rate-limiter";
import { components } from "./_generated/api";

// Guards the visitor-facing widget endpoints, which are unauthenticated by
// design (visitors aren't logged in) and each visitorMessage call schedules a
// paid AI completion — without this, a single misbehaving page or scripted
// abuser could spam the endpoint and run up the AI bill with zero friction.
export const rateLimiter = new RateLimiter(components.rateLimiter, {
  // Token bucket: normal chatting (a message every few seconds) never hits
  // this, but a burst above ~8 quick messages starts throttling.
  visitorMessage: { kind: "token bucket", rate: 8, period: MINUTE, capacity: 8 },
  // Looser — this fires once per page load/navigation, not per keystroke.
  widgetInit: { kind: "token bucket", rate: 20, period: MINUTE, capacity: 20 },
});

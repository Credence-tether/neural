import { defineApp } from "convex/server";
import rateLimiter from "@convex-dev/rate-limiter/convex.config"; // no .js suffix

const app = defineApp();
app.use(rateLimiter);
export default app;

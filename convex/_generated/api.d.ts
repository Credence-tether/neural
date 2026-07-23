/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as ai from "../ai.js";
import type * as aiHelpers from "../aiHelpers.js";
import type * as analytics from "../analytics.js";
import type * as auth from "../auth.js";
import type * as cannedResponses from "../cannedResponses.js";
import type * as conversations from "../conversations.js";
import type * as http from "../http.js";
import type * as knowledge from "../knowledge.js";
import type * as messages from "../messages.js";
import type * as pushNotifications from "../pushNotifications.js";
import type * as pushSubscriptions from "../pushSubscriptions.js";
import type * as siteUrl from "../siteUrl.js";
import type * as users from "../users.js";
import type * as visitors from "../visitors.js";
import type * as widge from "../widge.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  ai: typeof ai;
  aiHelpers: typeof aiHelpers;
  analytics: typeof analytics;
  auth: typeof auth;
  cannedResponses: typeof cannedResponses;
  conversations: typeof conversations;
  http: typeof http;
  knowledge: typeof knowledge;
  messages: typeof messages;
  pushNotifications: typeof pushNotifications;
  pushSubscriptions: typeof pushSubscriptions;
  siteUrl: typeof siteUrl;
  users: typeof users;
  visitors: typeof visitors;
  widge: typeof widge;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};

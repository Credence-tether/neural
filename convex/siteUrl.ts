// Canonical siteUrl key used by knowledgeChunks / crawlJobs / RAG lookups.
// "https://www.WolvCapital.com/about?x=1" -> "wolvcapital.com"
// The knowledge base was previously keyed on the EXACT string the admin typed
// into the crawl form, while the widget sent window.location.origin — any
// difference (www, trailing slash, protocol, casing) meant ZERO chunks were
// ever found and the AI answered every message with no knowledge at all.
export function normalizeSiteUrl(raw: string | undefined | null): string {
  if (!raw) return "";
  let s = raw.trim().toLowerCase();
  s = s.replace(/^https?:\/\//, "");
  s = s.replace(/^www\./, "");
  s = s.split(/[/?#]/)[0]; // drop path, query, hash
  return s;
}

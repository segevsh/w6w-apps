/**
 * YouTube quota is measured in **units, not requests** — and the numbers below
 * are the live ones, read from
 * https://developers.google.com/youtube/v3/determine_quota_cost on 2026-08-03,
 * not recited from folklore.
 *
 * That distinction matters, because the folklore is now wrong. Google's own page
 * states:
 *
 *   > "The `search.list` and `videos.insert` methods have their own quota
 *   > buckets. Each of these methods has a default daily limit of 100 per day.
 *   > The quota cost is 1 per call."
 *
 * The very widely repeated "`search.list` costs 100 units" figure describes the
 * *old* model. Under the current one a search costs **1 unit** and is instead
 * capped by a separate 100-calls-per-day bucket, so it no longer eats the main
 * allowance at all — but it runs out far sooner than a 10,000-unit budget would
 * suggest. Anything built on the old number budgets search wrongly in both
 * directions.
 *
 * The shape of the allowance:
 *   - 10,000 units/day shared by every method except the two below.
 *   - 100 `search.list` calls/day, in their own bucket, 1 unit each.
 *   - 100 `videos.insert` calls/day, in their own bucket, 1 unit each.
 *   - Every request costs at least 1 unit — including ones that fail validation.
 *   - Each extra page of a paginated result costs the method's price again.
 *   - Buckets reset at midnight Pacific Time.
 */

/** Units per call, keyed `resource.method`. Verified against the live table. */
export const QUOTA_COST = {
  "activities.list": 1,
  "captions.list": 50,
  "captions.insert": 400,
  "captions.update": 450,
  "captions.delete": 50,
  "channels.list": 1,
  "channels.update": 50,
  "channelSections.list": 1,
  "channelSections.insert": 50,
  "channelSections.update": 50,
  "channelSections.delete": 50,
  "comments.list": 1,
  "comments.insert": 50,
  "comments.update": 50,
  "comments.delete": 50,
  "commentThreads.list": 1,
  "commentThreads.insert": 50,
  "commentThreads.update": 50,
  "i18nLanguages.list": 1,
  "i18nRegions.list": 1,
  "members.list": 1,
  "membershipsLevels.list": 1,
  "playlistItems.list": 1,
  "playlistItems.insert": 50,
  "playlistItems.update": 50,
  "playlistItems.delete": 50,
  "playlists.list": 1,
  "playlists.insert": 50,
  "playlists.update": 50,
  "playlists.delete": 50,
  "search.list": 1,
  "subscriptions.list": 1,
  "subscriptions.insert": 50,
  "subscriptions.delete": 50,
  "thumbnails.set": 50,
  "videoAbuseReportReasons.list": 1,
  "videoCategories.list": 1,
  "videos.list": 1,
  "videos.insert": 1,
  "videos.update": 50,
  "videos.rate": 50,
  "videos.getRating": 1,
  "videos.reportAbuse": 50,
  "videos.delete": 50,
  "watermarks.set": 50,
  "watermarks.unset": 50,
} as const satisfies Record<string, number>;

export type QuotaMethod = keyof typeof QUOTA_COST;

/** Units in the shared daily bucket for a default project. */
export const DEFAULT_DAILY_UNITS = 10_000;

/**
 * Methods that do NOT draw on the shared bucket: each has its own daily
 * call-count allowance, and costs 1 unit against that bucket per call.
 */
export const SEPARATE_BUCKETS = {
  "search.list": 100,
  "videos.insert": 100,
} as const satisfies Partial<Record<QuotaMethod, number>>;

/** Cost of one call, for use in action descriptions and docs. */
export function quotaCost(method: QuotaMethod): number {
  return QUOTA_COST[method];
}

import { assert, assertEquals } from "@std/assert";
import { DEFAULT_DAILY_UNITS, QUOTA_COST, quotaCost, SEPARATE_BUCKETS } from "../../lib/quota.ts";

Deno.test("quota: the shared daily allowance is 10,000 units", () => {
  assertEquals(DEFAULT_DAILY_UNITS, 10_000);
});

Deno.test("quota: search.list costs 1 unit under the current model, not 100", () => {
  // This is the number most third-party material still gets wrong. Google's
  // live cost page: "The search.list and videos.insert methods have their own
  // quota buckets. Each of these methods has a default daily limit of 100 per
  // day. The quota cost is 1 per call."
  assertEquals(quotaCost("search.list"), 1);
  assertEquals(quotaCost("videos.insert"), 1);
  assertEquals(SEPARATE_BUCKETS["search.list"], 100);
  assertEquals(SEPARATE_BUCKETS["videos.insert"], 100);
});

Deno.test("quota: every list read costs 1 unit", () => {
  for (
    const m of [
      "activities.list",
      "channels.list",
      "comments.list",
      "commentThreads.list",
      "i18nLanguages.list",
      "playlistItems.list",
      "playlists.list",
      "subscriptions.list",
      "videoCategories.list",
      "videos.list",
      "videos.getRating",
    ] as const
  ) {
    assertEquals(quotaCost(m), 1, `${m} should cost 1 unit`);
  }
});

Deno.test("quota: writes cost 50 units, captions cost 400–450", () => {
  for (
    const m of [
      "channels.update",
      "comments.insert",
      "playlistItems.insert",
      "playlistItems.delete",
      "playlists.insert",
      "playlists.update",
      "playlists.delete",
      "subscriptions.insert",
      "subscriptions.delete",
      "videos.update",
      "videos.rate",
      "videos.delete",
    ] as const
  ) {
    assertEquals(quotaCost(m), 50, `${m} should cost 50 units`);
  }
  assertEquals(quotaCost("captions.insert"), 400);
  assertEquals(quotaCost("captions.update"), 450);
});

Deno.test("quota: no method is free — every request costs at least 1 unit", () => {
  for (const [method, cost] of Object.entries(QUOTA_COST)) {
    assert(cost >= 1, `${method} is listed as costing ${cost}`);
    assert(Number.isInteger(cost), `${method} has a non-integer cost`);
  }
});

Deno.test("quota: every method this app calls has a published cost", () => {
  for (
    const m of [
      "search.list",
      "videos.list",
      "videos.update",
      "videos.delete",
      "videos.rate",
      "channels.list",
      "playlists.list",
      "playlists.insert",
      "playlists.update",
      "playlists.delete",
      "playlistItems.list",
      "playlistItems.insert",
      "playlistItems.delete",
      "commentThreads.list",
      "comments.insert",
      "subscriptions.list",
      "i18nLanguages.list",
    ] as const
  ) {
    assert(m in QUOTA_COST, `${m} is missing from the cost table`);
  }
});

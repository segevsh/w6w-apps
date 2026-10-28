import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/search.ts";

Deno.test("search: hits /youtube/v3/search with part and invents no other defaults", async () => {
  const { ctx, calls } = mockCtx([{ body: { items: [] } }]);
  await action.execute!({ part: "snippet" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.hostname, "youtube.googleapis.com");
  assertEquals(url.pathname, "/youtube/v3/search");
  assertEquals(calls[0].method, "GET");
  // Google's own defaults (type=all, order=relevance, maxResults=5) must not be
  // shadowed by client-side ones.
  assertEquals([...url.searchParams.keys()], ["part"]);
});

Deno.test("search: serialises a multiselect part as a comma-separated value", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ part: ["id", "snippet"] }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("part"), "id,snippet");
});

Deno.test("search: collapses the repeated `type` parameter to one comma-separated value", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ part: "snippet", type: ["video", "playlist"] }, ctx);
  const p = new URL(calls[0].url).searchParams;
  // The API takes one `type` key, not repeated ones.
  assertEquals(p.getAll("type"), ["video,playlist"]);
});

Deno.test("search: forwards every documented filter", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({
    part: "snippet",
    q: "boating|sailing -fishing",
    type: "video",
    channelId: "UC1",
    channelType: "show",
    eventType: "live",
    order: "date",
    maxResults: 50,
    pageToken: "tok",
    publishedAfter: "2026-01-01T00:00:00Z",
    publishedBefore: "2026-08-01T00:00:00Z",
    regionCode: "US",
    relevanceLanguage: "en",
    safeSearch: "strict",
    topicId: "/m/019_rr",
    videoCategoryId: "22",
    videoDuration: "medium",
    videoDefinition: "high",
    videoCaption: "closedCaption",
    videoEmbeddable: "true",
    videoLicense: "creativeCommon",
    videoType: "movie",
    forMine: true,
  }, ctx);
  const p = new URL(calls[0].url).searchParams;
  assertEquals(p.get("q"), "boating|sailing -fishing");
  assertEquals(p.get("type"), "video");
  assertEquals(p.get("channelId"), "UC1");
  assertEquals(p.get("channelType"), "show");
  assertEquals(p.get("eventType"), "live");
  assertEquals(p.get("order"), "date");
  assertEquals(p.get("maxResults"), "50");
  assertEquals(p.get("pageToken"), "tok");
  assertEquals(p.get("publishedAfter"), "2026-01-01T00:00:00Z");
  assertEquals(p.get("publishedBefore"), "2026-08-01T00:00:00Z");
  assertEquals(p.get("regionCode"), "US");
  assertEquals(p.get("relevanceLanguage"), "en");
  assertEquals(p.get("safeSearch"), "strict");
  assertEquals(p.get("topicId"), "/m/019_rr");
  assertEquals(p.get("videoCategoryId"), "22");
  assertEquals(p.get("videoDuration"), "medium");
  assertEquals(p.get("videoDefinition"), "high");
  assertEquals(p.get("videoCaption"), "closedCaption");
  assertEquals(p.get("videoEmbeddable"), "true");
  assertEquals(p.get("videoLicense"), "creativeCommon");
  assertEquals(p.get("videoType"), "movie");
  assertEquals(p.get("forMine"), "true");
});

Deno.test("search: is typed as a search action and requires part", () => {
  assertEquals(action.type, "search");
  const part = action.params!.find((p) => p.key === "part");
  assertEquals(part?.required, true);
  assertEquals(part?.default, "snippet");
  // Search results carry only these two parts.
  assertEquals((part!.options as Array<{ value: string }>).map((o) => o.value), ["id", "snippet"]);
});

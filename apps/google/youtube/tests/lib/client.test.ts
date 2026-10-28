import { assert, assertEquals, assertThrows } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { API_URL, csv, normalizePart, partParam, PARTS, YouTubeClient } from "../../lib/client.ts";

Deno.test("client: targets youtube.googleapis.com, not the generic Google front door", () => {
  assertEquals(API_URL, "https://youtube.googleapis.com/youtube/v3");
  const host = new URL(API_URL).hostname;
  assertEquals(host, "youtube.googleapis.com");
  // The manifest allowlist must be exactly this host and nothing wider.
  assert(host !== "www.googleapis.com");
});

Deno.test("normalizePart: accepts a multiselect array and joins with commas", () => {
  assertEquals(normalizePart(["snippet", "statistics"]), "snippet,statistics");
});

Deno.test("normalizePart: accepts a hand-typed comma string", () => {
  assertEquals(normalizePart("snippet,contentDetails"), "snippet,contentDetails");
});

Deno.test("normalizePart: trims whitespace and drops empty entries", () => {
  assertEquals(normalizePart(" snippet , , contentDetails "), "snippet,contentDetails");
  assertEquals(normalizePart(["snippet", "", "  ", "status"]), "snippet,status");
});

Deno.test("normalizePart: de-duplicates while preserving the caller's order", () => {
  assertEquals(normalizePart(["status", "snippet", "status"]), "status,snippet");
  assertEquals(normalizePart("snippet,snippet"), "snippet");
});

Deno.test("normalizePart: throws rather than sending a request the API will reject", () => {
  // `part` is required on nearly every endpoint; failing here names the problem.
  for (const empty of ["", "   ", ",,", [], ["", " "]] as Array<string | string[]>) {
    assertThrows(() => normalizePart(empty), Error, "`part` is required");
  }
  assertThrows(() => normalizePart(undefined), Error, "`part` is required");
});

Deno.test("partParam: builds a required multiselect from the documented value set", () => {
  const p = partParam("video", "snippet,statistics");
  assertEquals(p.key, "part");
  assertEquals(p.type, "multiselect");
  assertEquals(p.required, true);
  assertEquals(p.default, "snippet,statistics");
  const values = (p.options as Array<{ value: string }>).map((o) => o.value);
  assertEquals(values, [...PARTS.video]);
});

Deno.test("PARTS: excludes etag and kind, which are response fields and not parts", () => {
  for (const [resource, parts] of Object.entries(PARTS)) {
    assert(!parts.includes("etag" as never), `${resource} lists etag as a part`);
    assert(!parts.includes("kind" as never), `${resource} lists kind as a part`);
    assert(parts.length > 0, `${resource} has no parts`);
    assertEquals(new Set(parts).size, parts.length, `${resource} has duplicate parts`);
  }
});

Deno.test("PARTS: matches the documented value sets", () => {
  // Verified against developers.google.com/youtube/v3/docs/<resource>/list.
  assertEquals([...PARTS.searchResult].sort(), ["id", "snippet"]);
  assertEquals([...PARTS.comment].sort(), ["id", "snippet"]);
  assertEquals([...PARTS.commentThread].sort(), ["id", "replies", "snippet"]);
  assertEquals([...PARTS.playlistItem].sort(), ["contentDetails", "id", "snippet", "status"]);
  assertEquals([...PARTS.playlist].sort(), [
    "contentDetails",
    "id",
    "localizations",
    "player",
    "snippet",
    "status",
  ]);
  assertEquals([...PARTS.subscription].sort(), [
    "contentDetails",
    "id",
    "snippet",
    "subscriberSnippet",
  ]);
  assertEquals([...PARTS.channel].sort(), [
    "auditDetails",
    "brandingSettings",
    "contentDetails",
    "contentOwnerDetails",
    "id",
    "localizations",
    "snippet",
    "statistics",
    "status",
    "topicDetails",
  ]);
  assertEquals([...PARTS.video].sort(), [
    "brandPartner",
    "contentDetails",
    "fileDetails",
    "id",
    "liveStreamingDetails",
    "localizations",
    "paidProductPlacementDetails",
    "player",
    "processingDetails",
    "recordingDetails",
    "snippet",
    "statistics",
    "status",
    "suggestions",
    "topicDetails",
  ]);
});

Deno.test("csv: joins arrays, trims, drops empties, returns undefined when nothing is left", () => {
  assertEquals(csv(["a", "b"]), "a,b");
  assertEquals(csv(" a , b "), "a,b");
  assertEquals(csv([]), undefined);
  assertEquals(csv(""), undefined);
  assertEquals(csv(undefined), undefined);
});

Deno.test("client: serialises part onto the query string", async () => {
  const { ctx, calls } = mockCtx([{ body: { items: [] } }]);
  await new YouTubeClient(ctx).request("/videos", { part: ["snippet", "statistics"] });
  const url = new URL(calls[0].url);
  assertEquals(url.origin + url.pathname, "https://youtube.googleapis.com/youtube/v3/videos");
  assertEquals(url.searchParams.get("part"), "snippet,statistics");
});

Deno.test("client: omits undefined, null and empty query values", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new YouTubeClient(ctx).request("/videos", {
    part: "id",
    query: { a: undefined, b: null, c: "", d: "keep", e: false, f: 0 },
  });
  const p = new URL(calls[0].url).searchParams;
  assertEquals([...p.keys()].sort(), ["d", "e", "f", "part"]);
  // `false` and `0` are meaningful values, not "unset".
  assertEquals(p.get("e"), "false");
  assertEquals(p.get("f"), "0");
});

Deno.test("client: JSON-encodes a body and sets content-type", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "x" } }]);
  await new YouTubeClient(ctx).request("/playlists", {
    method: "POST",
    part: "snippet",
    body: { snippet: { title: "t" } },
  });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), { snippet: { title: "t" } });
});

Deno.test("client: never sets an Authorization header — sign owns the credential", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new YouTubeClient(ctx).request("/videos", { part: "id" });
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(new URL(calls[0].url).searchParams.get("key"), null);
});

Deno.test("client: returns undefined for a 204 and for an empty 200", async () => {
  const { ctx } = mockCtx([{ status: 204 }, { status: 200, body: "" }]);
  const client = new YouTubeClient(ctx);
  assertEquals(await client.request("/videos", { method: "DELETE" }), undefined);
  assertEquals(await client.request("/videos", { method: "DELETE" }), undefined);
});

Deno.test("client: throws with status, method, path and body on a failure", async () => {
  const { ctx } = mockCtx([{ status: 403, statusText: "Forbidden", body: "quotaExceeded" }]);
  const err = await new YouTubeClient(ctx)
    .request("/search", { part: "snippet" })
    .then(() => null, (e: Error) => e);
  assert(err instanceof Error);
  assert(err.message.includes("403"));
  assert(err.message.includes("/youtube/v3/search"));
  assert(err.message.includes("quotaExceeded"));
});

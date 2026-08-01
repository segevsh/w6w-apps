import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { compact, csv, extractId, SpotifyClient, unset } from "../../lib/client.ts";

Deno.test("client: sends the JSON accept header and no Authorization of its own", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "1" } }]);
  await new SpotifyClient(ctx).request("/tracks/1");
  assertEquals(calls[0].url, "https://api.spotify.com/v1/tracks/1");
  assertEquals(calls[0].headers["accept"], "application/json");
  assertEquals("authorization" in calls[0].headers, false);
});

Deno.test("client: surfaces Spotify's error body", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    statusText: "Not Found",
    body: '{"error":{"status":404,"message":"non existing id"}}',
  }]);
  await assertRejects(
    () => new SpotifyClient(ctx).request("/tracks/bogus"),
    Error,
    "non existing id",
  );
});

Deno.test("client: returns undefined for Spotify's 204 responses", async () => {
  const { ctx } = mockCtx([{ status: 204 }]);
  assertEquals(
    await new SpotifyClient(ctx).request("/me/player/currently-playing"),
    undefined,
  );
});

Deno.test("client: drops undefined/null query params rather than sending them empty", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new SpotifyClient(ctx).request("/search", {
    query: { q: "x", market: undefined, limit: 5 },
  });
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.has("market"), false);
  assertEquals(url.searchParams.get("limit"), "5");
});

Deno.test("compact: keeps false/0 but drops unset fields", () => {
  assertEquals(compact({ public: false, n: 0, a: undefined, b: null }), { public: false, n: 0 });
});

Deno.test("unset: a blank form field is absent", () => {
  assertEquals(unset(""), undefined);
  assertEquals(unset("x"), "x");
});

Deno.test("csv: splits, trims and drops blanks; an empty field stays unset", () => {
  assertEquals(csv("a, b ,,c"), ["a", "b", "c"]);
  assertEquals(csv(""), undefined);
  assertEquals(csv(undefined), undefined);
});

Deno.test("extractId: passes a bare ID through and strips a spotify:<type>:<id> URI", () => {
  assertEquals(extractId("abc123"), "abc123");
  assertEquals(extractId("spotify:track:abc123"), "abc123");
  assertEquals(extractId("spotify:playlist:xyz789"), "xyz789");
});

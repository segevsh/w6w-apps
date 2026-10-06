import { assertEquals, assertRejects } from "@std/assert";
import search from "../../actions/youtube-search.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("youtube-search: GETs /youtube/search and repeats `features` per value", async () => {
  const body = {
    query: "cats",
    results: [{ type: "video", id: "v", title: "t" }],
    totalResults: 1,
  };
  const { ctx, calls } = mockCtx([{ body }]);
  const out = await search.execute(
    { query: "cats", type: "video", sortBy: "views", features: ["hd", "4k"], limit: 5 },
    ctx,
  );
  assertEquals(out, body);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v1/youtube/search");
  assertEquals(url.searchParams.getAll("features"), ["hd", "4k"]);
  assertEquals(url.searchParams.get("query"), "cats");
  assertEquals(url.searchParams.get("type"), "video");
  assertEquals(url.searchParams.get("limit"), "5");
  assertEquals(url.searchParams.has("uploadDate"), false);
});

Deno.test("youtube-search: features accepts a comma string; a blank query makes no call", async () => {
  const { ctx, calls } = mockCtx([{ body: { query: "q", results: [] } }]);
  await search.execute({ query: "q", features: "hd, live", nextPageToken: "tok" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.getAll("features"), ["hd", "live"]);
  assertEquals(url.searchParams.get("nextPageToken"), "tok");
  const none = mockCtx();
  await assertRejects(
    async () => await search.execute({ query: " " }, none.ctx),
    Error,
    "required",
  );
  assertEquals(none.calls.length, 0);
});

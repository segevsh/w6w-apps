import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/create-playlist.ts";

Deno.test("create-playlist: POSTs /youtube/v3/playlists with a snippet body", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "PL1" } }]);
  await action.execute!({ part: "snippet", title: "My list" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "POST");
  assertEquals(url.pathname, "/youtube/v3/playlists");
  assertEquals(url.searchParams.get("part"), "snippet");
  assertEquals(JSON.parse(calls[0].body!), { snippet: { title: "My list" } });
});

Deno.test("create-playlist: forces snippet into part even if the caller omits it", async () => {
  // snippet.title is required by the API, so the snippet part is not optional.
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ part: "contentDetails", title: "T" }, ctx);
  const part = new URL(calls[0].url).searchParams.get("part");
  assertEquals(part, "contentDetails,snippet");
});

Deno.test("create-playlist: adds status to part when privacy is supplied", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ part: "snippet", title: "T", privacyStatus: "unlisted" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("part"), "snippet,status");
  assertEquals(JSON.parse(calls[0].body!).status, { privacyStatus: "unlisted" });
});

Deno.test("create-playlist: omits status entirely when no privacy is supplied", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ part: "snippet,status", title: "T" }, ctx);
  // `part` is honoured as given, but no empty status object is invented.
  assertEquals(new URL(calls[0].url).searchParams.get("part"), "snippet,status");
  assertEquals(JSON.parse(calls[0].body!).status, undefined);
});

Deno.test("create-playlist: does not duplicate snippet when already present", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ part: ["snippet", "snippet"], title: "T" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("part"), "snippet");
});

Deno.test("create-playlist: carries optional snippet fields and splits tags", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({
    part: "snippet",
    title: "T",
    description: "D",
    tags: "a,b",
    defaultLanguage: "en",
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!).snippet, {
    title: "T",
    description: "D",
    tags: ["a", "b"],
    defaultLanguage: "en",
  });
});

Deno.test("create-playlist: is honestly non-idempotent", () => {
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, false);
});

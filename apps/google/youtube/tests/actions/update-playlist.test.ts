import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/update-playlist.ts";

Deno.test("update-playlist: PUTs /youtube/v3/playlists with id and snippet", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "PL1" } }]);
  await action.execute!({ id: "PL1", part: "snippet", title: "T" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "PUT");
  assertEquals(url.pathname, "/youtube/v3/playlists");
  assertEquals(url.searchParams.get("part"), "snippet");
  assertEquals(JSON.parse(calls[0].body!), { id: "PL1", snippet: { title: "T" } });
});

Deno.test("update-playlist: always writes snippet — the API requires the title", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ id: "PL1", part: "status", title: "T", privacyStatus: "private" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("part"), "status,snippet");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.snippet.title, "T");
  assertEquals(body.status, { privacyStatus: "private" });
});

Deno.test("update-playlist: adds status to part when privacy is supplied", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ id: "PL1", part: "snippet", title: "T", privacyStatus: "public" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("part"), "snippet,status");
});

Deno.test("update-playlist: requires the title on the definition, not just in prose", () => {
  const title = action.params!.find((p) => p.key === "title");
  assertEquals(title?.required, true);
  const id = action.params!.find((p) => p.key === "id");
  assertEquals(id?.required, true);
  assertEquals(action.idempotent, true);
});

Deno.test("update-playlist: splits tags and carries optional fields", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({
    id: "PL1",
    part: "snippet",
    title: "T",
    description: "D",
    tags: ["x", "y"],
    defaultLanguage: "it",
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!).snippet, {
    title: "T",
    description: "D",
    tags: ["x", "y"],
    defaultLanguage: "it",
  });
});

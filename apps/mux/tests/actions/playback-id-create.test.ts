import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/playback-id-create.ts";

Deno.test("playback-id-create: mints an id and returns usable URLs", async () => {
  const { ctx, calls } = mockCtx([{
    status: 201,
    body: { data: { id: "pb1", policy: "public" } },
  }]);
  const out = await action.execute!({ assetId: "a1", policy: "public" }, ctx) as {
    streamUrl: string;
    thumbnailUrl: string;
  };
  assertEquals(new URL(calls[0].url).pathname, "/video/v1/assets/a1/playback-ids");
  assertEquals(out.streamUrl, "https://stream.mux.com/pb1.m3u8");
  assert(out.thumbnailUrl.startsWith("https://image.mux.com/pb1/"), out.thumbnailUrl);
});

/** A signed id has no URL this app can build. */
Deno.test("playback-id-create: a signed id returns no URL, and says why", async () => {
  const { ctx, logs } = mockCtx([{ status: 201, body: { data: { id: "pb2", policy: "signed" } } }]);
  const out = await action.execute!({ assetId: "a1", policy: "signed" }, ctx) as {
    streamUrl?: string;
  };
  assertEquals(out.streamUrl, undefined);
  assert(logs.some((l) => l.level === "warn" && /JWT/.test(l.message)), JSON.stringify(logs));
});

Deno.test("playback-id-create: a missing asset is refused", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "assetId");
});

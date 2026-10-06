import { assertEquals, assertRejects } from "@std/assert";
import metadata from "../../actions/metadata-get.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("metadata-get: GETs /metadata?url= and returns the unified document", async () => {
  const body = {
    platform: "tiktok",
    type: "video",
    id: "1",
    stats: { views: null, likes: 2, comments: 0, shares: 1 },
  };
  const { ctx, calls } = mockCtx([{ body }]);
  assertEquals(await metadata.execute({ url: "https://tiktok.com/@a/video/1" }, ctx), body);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v1/metadata");
  assertEquals(url.searchParams.get("url"), "https://tiktok.com/@a/video/1");
});

Deno.test("metadata-get: 429 names the credit/rate cause; a missing url makes no call", async () => {
  const { ctx } = mockCtx([{
    status: 429,
    body: { error: "limit-exceeded", message: "m", details: "Too many" },
  }]);
  await assertRejects(
    async () => await metadata.execute({ url: "https://x.test" }, ctx),
    Error,
    "limit-exceeded: Too many",
  );
  const none = mockCtx();
  await assertRejects(async () => await metadata.execute({ url: "" }, none.ctx), Error, "required");
  assertEquals(none.calls.length, 0);
});

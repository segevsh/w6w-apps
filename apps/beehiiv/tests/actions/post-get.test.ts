import { assert, assertEquals, assertRejects } from "@std/assert";
import postGet from "../../actions/post-get.ts";
import { mockCtx, POST_CREATION_FAILED_404 } from "../_helpers.ts";

Deno.test("post-get: fetches GET /publications/:id/posts/:id with expand and premiumTiers", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { id: "post_1", title: "Launch" } } }]);

  const out = await postGet.execute({
    publicationId: "pub_1",
    postId: "post_1",
    expand: "stats,free_web_content",
    premiumTiers: "Gold",
  }, ctx) as { processing: boolean; id: string };

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/publications/pub_1/posts/post_1");
  assertEquals(url.searchParams.getAll("expand[]"), ["stats", "free_web_content"]);
  assertEquals(url.searchParams.get("premium_tiers"), "Gold");
  assertEquals(out.processing, false);
  assertEquals(out.id, "post_1");
});

Deno.test("post-get: a still-building post reports processing: true rather than throwing", async () => {
  const { ctx } = mockCtx([{ status: 202, body: { data: { id: "post_1", state: "pending" } } }]);
  const out = await postGet.execute({ publicationId: "pub_1", postId: "post_1" }, ctx) as {
    processing: boolean;
    id: string;
    state: string;
  };
  assertEquals(out.processing, true);
  assertEquals(out.id, "post_1");
  assertEquals(out.state, "pending");
});

Deno.test("post-get: a permanently failed background build throws, naming POST_CREATION_FAILED", async () => {
  const { ctx } = mockCtx([POST_CREATION_FAILED_404]);
  await assertRejects(
    () => Promise.resolve(postGet.execute({ publicationId: "pub_1", postId: "post_1" }, ctx)),
    Error,
    "POST_CREATION_FAILED",
  );
});

Deno.test("post-get: any other non-2xx status throws with the raw body", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "gateway error" }]);
  await assertRejects(
    () => Promise.resolve(postGet.execute({ publicationId: "pub_1", postId: "post_1" }, ctx)),
    Error,
    "500",
  );
});

Deno.test("post-get: is a read action", () => {
  assertEquals(postGet.type, "read");
  assert(Array.isArray(postGet.output) && postGet.output.some((o) => o.key === "processing"));
});

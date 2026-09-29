import { assert, assertEquals, assertRejects } from "@std/assert";
import postUpdate from "../../actions/post-update.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("post-update: PATCHes only the given fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { id: "post_1", title: "New title" } } }]);

  const out = await postUpdate.execute(
    { publicationId: "pub_1", postId: "post_1", title: "New title" },
    ctx,
  ) as { processing: boolean; title: string };

  assertEquals(calls[0].url, "https://api.beehiiv.com/v2/publications/pub_1/posts/post_1");
  assertEquals(calls[0].method, "PATCH");
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent, { title: "New title" });
  assertEquals(out.processing, false);
  assertEquals(out.title, "New title");
});

Deno.test("post-update: a still-processing update reports processing: true", async () => {
  const { ctx } = mockCtx([{ status: 202, body: { data: { id: "post_1", state: "pending" } } }]);
  const out = await postUpdate.execute(
    { publicationId: "pub_1", postId: "post_1", title: "x" },
    ctx,
  ) as {
    processing: boolean;
  };
  assertEquals(out.processing, true);
});

Deno.test("post-update: rejects bodyContent and blocks together, before any fetch", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    () =>
      Promise.resolve(postUpdate.execute(
        { publicationId: "pub_1", postId: "post_1", bodyContent: "<p>x</p>", blocks: [{}] },
        ctx,
      )),
    Error,
    "bodyContent OR blocks",
  );
  assertEquals(calls.length, 0);
});

Deno.test("post-update: any non-2xx, non-202 status throws with the raw body", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "gateway error" }]);
  await assertRejects(
    () =>
      Promise.resolve(
        postUpdate.execute({ publicationId: "pub_1", postId: "post_1", title: "x" }, ctx),
      ),
    Error,
    "500",
  );
});

Deno.test("post-update: is an idempotent perform action", () => {
  assert(!!postUpdate.idempotent);
  assertEquals(postUpdate.type, "perform");
});

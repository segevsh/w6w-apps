import { assertEquals, assertRejects } from "@std/assert";
import videoDelete from "../../actions/video-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("video-delete: deletes by id", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "v1", object: "video.deleted", deleted: true } }]);
  const out = await videoDelete.execute({ videoId: "v1" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/v3/videos/v1");
  assertEquals(out, { id: "v1", deleted: true });
});

Deno.test("video-delete: refusing an in-progress job surfaces the vendor's reason", async () => {
  const { ctx } = mockCtx([{ status: 409, body: { detail: "Job still in progress" } }]);
  await assertRejects(
    async () => await videoDelete.execute({ videoId: "v1" }, ctx),
    Error,
    "still in progress",
  );
});

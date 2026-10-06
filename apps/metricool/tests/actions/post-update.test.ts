import { assertEquals } from "@std/assert";
import postUpdate from "../../actions/post-update.ts";
import { envelope, jsonBody, mockCtx, pathOf } from "../_helpers.ts";

const POST = {
  text: "Hello",
  publicationDate: "2026-11-03T10:15:30",
  timezone: "Europe/Madrid",
  providers: [{ network: "instagram" }],
};

Deno.test("post-update: PUT /v2/scheduler/posts/{id} sends the whole post", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: 5 }) }]);
  await postUpdate.execute({ blogId: "9", id: "5", ...POST }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/api/v2/scheduler/posts/5");
  assertEquals((jsonBody(calls[0]) as { text: string }).text, "Hello");
});

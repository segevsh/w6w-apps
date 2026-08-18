import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/image-create.ts";

Deno.test("image-create: places an image by URL", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "i1" } }], { display: {} });
  await action.execute!({
    boardId: "b1",
    url: "https://example.com/chart.png",
    title: "Chart",
  }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v2/boards/b1/images");
  assertEquals(JSON.parse(calls[0].body!).data, {
    url: "https://example.com/chart.png",
    title: "Chart",
  });
});

Deno.test("image-create: a URL is required — this is not the upload arm", async () => {
  const { ctx, calls } = mockCtx([], { display: {} });
  await assertRejects(async () => await action.execute!({ boardId: "b1" }, ctx), Error, "`url`");
  assertEquals(calls.length, 0);
});

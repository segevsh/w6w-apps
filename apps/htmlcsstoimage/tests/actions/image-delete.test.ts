import { assertEquals, assertRejects } from "@std/assert";
import imageDelete from "../../actions/image-delete.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("image-delete: DELETEs the singular route and reports the 202 with no body", async () => {
  const { ctx, calls } = mockCtx([{ status: 202, body: undefined }]);
  const out = await imageDelete.execute({ imageId: "i1" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/v1/image/i1");
  assertEquals(out, { imageId: "i1", status: 202 });
});

Deno.test("image-delete: a 404 on an unknown id surfaces as an error", async () => {
  const { ctx } = mockCtx([{ status: 404, body: errorBody("Not Found", "No such image", 404) }]);
  const err = await assertRejects(
    async () => await imageDelete.execute({ imageId: "i1" }, ctx),
    Error,
  );
  assertEquals(err.message.includes("404 Not Found"), true, err.message);
});

Deno.test("image-delete: requires an id; is declared idempotent", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await imageDelete.execute({ imageId: "" }, ctx),
    Error,
    "imageId",
  );
  assertEquals(calls.length, 0);
  assertEquals(imageDelete.idempotent, true);
});

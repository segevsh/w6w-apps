import { assertEquals, assertRejects } from "@std/assert";
import contentUnpublish from "../../actions/content-unpublish.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("content-unpublish: sends POST /contents/${seg(input.contentId)}/visibility/unpublish", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 1 } }]);
  const out = await contentUnpublish.execute({ "contentId": "1" } as never, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/publisher_api/v1/contents/1/visibility/unpublish");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body, null);
  assertEquals(out, { "id": 1 });
});

Deno.test("content-unpublish: a 422 surfaces the vendor's message", async () => {
  const { ctx } = mockCtx([{ status: 422, body: { message: "bad input" } }]);
  await assertRejects(
    () => contentUnpublish.execute({ "contentId": "1" } as never, ctx) as Promise<unknown>,
    Error,
    "bad input",
  );
});

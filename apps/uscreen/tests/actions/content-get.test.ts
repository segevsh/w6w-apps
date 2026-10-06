import { assertEquals, assertRejects } from "@std/assert";
import contentGet from "../../actions/content-get.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("content-get: sends GET /contents/${seg(input.contentId)}", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 1 } }]);
  const out = await contentGet.execute({ "contentId": "1", "include": "author" } as never, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/publisher_api/v1/contents/1");
  assertEquals(queryOf(calls[0].url), { "include": "author" });
  assertEquals(calls[0].body, null);
  assertEquals(out, { "id": 1 });
});

Deno.test("content-get: a 422 surfaces the vendor's message", async () => {
  const { ctx } = mockCtx([{ status: 422, body: { message: "bad input" } }]);
  await assertRejects(
    () =>
      contentGet.execute({ "contentId": "1", "include": "author" } as never, ctx) as Promise<
        unknown
      >,
    Error,
    "bad input",
  );
});

import { assertEquals, assertRejects } from "@std/assert";
import contentPublish from "../../actions/content-publish.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("content-publish: sends POST /contents/${seg(input.contentId)}/visibility/publish", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 1 } }]);
  const out = await contentPublish.execute(
    { "contentId": "1", "eventLaunchDatetime": "2030-06-01T12:00:00Z" } as never,
    ctx,
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/publisher_api/v1/contents/1/visibility/publish");
  assertEquals(queryOf(calls[0].url), { "event_launch_datetime": "2030-06-01T12:00:00Z" });
  assertEquals(calls[0].body, null);
  assertEquals(out, { "id": 1 });
});

Deno.test("content-publish: a 422 surfaces the vendor's message", async () => {
  const { ctx } = mockCtx([{ status: 422, body: { message: "bad input" } }]);
  await assertRejects(
    () =>
      contentPublish.execute(
        { "contentId": "1", "eventLaunchDatetime": "2030-06-01T12:00:00Z" } as never,
        ctx,
      ) as Promise<unknown>,
    Error,
    "bad input",
  );
});

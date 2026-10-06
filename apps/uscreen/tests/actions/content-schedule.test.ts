import { assertEquals, assertRejects } from "@std/assert";
import contentSchedule from "../../actions/content-schedule.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("content-schedule: sends POST /contents/${seg(input.contentId)}/visibility/schedule", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 1 } }]);
  const out = await contentSchedule.execute(
    {
      "contentId": "1",
      "scheduledDatetime": "2030-06-01T12:00:00Z",
      "schedulePublished": true,
    } as never,
    ctx,
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/publisher_api/v1/contents/1/visibility/schedule");
  assertEquals(queryOf(calls[0].url), {
    "scheduled_datetime": "2030-06-01T12:00:00Z",
    "schedule_published": "true",
  });
  assertEquals(calls[0].body, null);
  assertEquals(out, { "id": 1 });
});

Deno.test("content-schedule: a 422 surfaces the vendor's message", async () => {
  const { ctx } = mockCtx([{ status: 422, body: { message: "bad input" } }]);
  await assertRejects(
    () =>
      contentSchedule.execute(
        {
          "contentId": "1",
          "scheduledDatetime": "2030-06-01T12:00:00Z",
          "schedulePublished": true,
        } as never,
        ctx,
      ) as Promise<unknown>,
    Error,
    "bad input",
  );
});

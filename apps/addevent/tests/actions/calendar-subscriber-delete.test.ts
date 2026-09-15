import { assertEquals, assertRejects } from "@std/assert";
import calendarSubscriberDelete from "../../actions/calendar-subscriber-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("calendar-subscriber-delete: DELETEs and reports the 204 with no body to parse", async () => {
  const { ctx, calls } = mockCtx([{ status: 204, body: undefined }]);
  const out = await calendarSubscriberDelete.execute({ subscriberId: "sub-1" }, ctx) as {
    subscriberId: string;
    status: number;
  };
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/calevent/v2/subscribers/sub-1");
  assertEquals(out, { subscriberId: "sub-1", status: 204 });
});

Deno.test("calendar-subscriber-delete: a repeat delete on an unknown id surfaces as an error", async () => {
  const { ctx } = mockCtx([{ status: 404, body: undefined }]);
  await assertRejects(
    () => Promise.resolve(calendarSubscriberDelete.execute({ subscriberId: "sub-1" }, ctx)),
    Error,
  );
});

Deno.test("calendar-subscriber-delete: is declared idempotent", () => {
  assertEquals(calendarSubscriberDelete.idempotent, true);
});

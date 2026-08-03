import { assert, assertEquals } from "@std/assert";
import { BASE_PATH, bodyOf, DISPLAY, mockCtx } from "../_helpers.ts";
import action from "../../actions/entry-notifications-send.ts";

Deno.test("entry-notifications-send: POSTs to /entries/{id}/notifications", async () => {
  const { ctx, calls } = mockCtx([{ body: ["5f1a", "5f1b"] }], { display: DISPLAY });
  const out = await action.execute!({ entryId: 159 }, ctx) as { notifications: string[] };
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, `${BASE_PATH}/entries/159/notifications`);
  assertEquals(out.notifications, ["5f1a", "5f1b"]);
});

Deno.test("entry-notifications-send: joins notification IDs into _notifications", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }], { display: DISPLAY });
  await action.execute!({ entryId: 159, notificationIds: ["5f1a", "5f1b"] }, ctx);
  assertEquals(bodyOf(calls)._notifications, "5f1a,5f1b");
});

Deno.test("entry-notifications-send: an empty ID list omits _notifications entirely", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }], { display: DISPLAY });
  await action.execute!({ entryId: 159, notificationIds: [] }, ctx);
  assert(!("_notifications" in bodyOf(calls)));
});

Deno.test("entry-notifications-send: blank IDs are filtered out of the list", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }], { display: DISPLAY });
  await action.execute!({ entryId: 159, notificationIds: ["5f1a", "", "5f1b"] }, ctx);
  assertEquals(bodyOf(calls)._notifications, "5f1a,5f1b");
});

Deno.test("entry-notifications-send: forwards a custom event as _event", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }], { display: DISPLAY });
  await action.execute!({ entryId: 159, event: "form_submission" }, ctx);
  assertEquals(bodyOf(calls)._event, "form_submission");
});

Deno.test("entry-notifications-send: an unset event is omitted so the vendor default applies", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }], { display: DISPLAY });
  await action.execute!({ entryId: 159 }, ctx);
  assertEquals(bodyOf(calls), {});
});

Deno.test("entry-notifications-send: sends email, so it is declared non-idempotent", () => {
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, false);
  assert(action.output);
});

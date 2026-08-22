import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, ok } from "./_shared.ts";
import action from "../../actions/notification-count.ts";

Deno.test("notification-count: one call, one integer", async () => {
  const { ctx, calls } = mockCtx([ok({ count: 7 })], { display });
  const result = await action.execute!({}, ctx);
  assert(calls[0].url.endsWith("app.bsky.notification.getUnreadCount"), calls[0].url);
  assertEquals(calls.length, 1);
  assertEquals(result, { count: 7, hasUnread: true });
});

Deno.test("notification-count: zero is the common case and reads cleanly", async () => {
  const { ctx } = mockCtx([ok({ count: 0 })], { display });
  assertEquals(await action.execute!({}, ctx), { count: 0, hasUnread: false });
});

Deno.test("notification-count: a missing count reads as zero, not NaN", async () => {
  const { ctx } = mockCtx([ok({})], { display });
  assertEquals(await action.execute!({}, ctx), { count: 0, hasUnread: false });
});

Deno.test("notification-count: takes no parameters, because it cannot be filtered", () => {
  assertEquals(action.params?.length ?? 0, 0);
  assert(/cannot be filtered/.test(action.description!), action.description);
});

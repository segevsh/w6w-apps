import { assert, assertEquals } from "@std/assert";
import listNotifications from "../../actions/list-notifications.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

const FEED = {
  notifications: [
    {
      id: 32514315,
      type: 0,
      created_at: "2026-08-11T00:00:00Z",
      content: "<strong>You</strong> paid",
    },
  ],
};

Deno.test("list-notifications: passes updated_after and limit through", async () => {
  const { ctx, calls } = mockCtx([{ body: FEED }]);
  await listNotifications.execute({ updated_after: "2026-08-01T00:00:00Z", limit: 50 }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/v3.0/get_notifications");
  assertEquals(queryOf(calls[0].url), { updated_after: "2026-08-01T00:00:00Z", limit: "50" });
});

/**
 * "Omit (or provide `0`) to get the maximum number of notifications." The
 * vendor's default is 0, which is the opposite of every other paging default in
 * this API — so no limit is prefilled, and a caller asking for 0 gets it.
 */
Deno.test("list-notifications: prefills no limit, and 0 survives to the query", async () => {
  assertEquals(listNotifications.params?.find((p) => p.key === "limit")?.default, undefined);

  const { ctx, calls } = mockCtx([{ body: FEED }]);
  await listNotifications.execute({ limit: 0 }, ctx);
  assertEquals(queryOf(calls[0].url), { limit: "0" });
});

/**
 * "Notification types may be added in the future without warning." The integer
 * is passed through rather than mapped, because a mapping that swallowed an
 * unknown code would be worse than the number.
 */
Deno.test("list-notifications: the numeric type is passed through unmapped", async () => {
  const { ctx } = mockCtx([{ body: { notifications: [{ id: 1, type: 99 }] } }]);
  const out = await listNotifications.execute({}, ctx) as {
    notifications: Array<{ type: number }>;
  };
  assertEquals(out.notifications[0].type, 99);
});

Deno.test("list-notifications: an empty request sends no query at all", async () => {
  const { ctx, calls } = mockCtx([{ body: FEED }]);
  await listNotifications.execute({}, ctx);
  assertEquals(queryOf(calls[0].url), {});
  assert(!calls[0].url.includes("?"), calls[0].url);
});

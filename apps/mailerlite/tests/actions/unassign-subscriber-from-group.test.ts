import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/unassign-subscriber-from-group.ts";

Deno.test("unassign-subscriber-from-group: DELETEs the subscriber-rooted path", async () => {
  const { ctx, calls } = mockCtx([{ status: 204, headers: {} }]);
  const out = await action.execute!({ subscriberId: "31986843064993537", groupId: "42" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(
    new URL(calls[0].url).pathname,
    "/api/subscribers/31986843064993537/groups/42",
  );
  assertEquals(out, { success: true });
});

Deno.test("unassign-subscriber-from-group: is declared idempotent", () => {
  assertEquals(action.idempotent, true);
});

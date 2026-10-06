import { assertEquals } from "@std/assert";
import action from "../../actions/user-presence-get.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("user-presence-get: GETs /users/{id}/presences", async () => {
  const { ctx, calls } = mockCtx([{ body: { user_id: 4, in_call: 1, is_snoozed: false } }]);
  const out = await action.execute!({ userId: 4 }, ctx);
  assertEquals(calls[0].url, "https://public-api.ringover.com/v2/users/4/presences");
  assertEquals(out, { user_id: 4, in_call: 1, is_snoozed: false });
});

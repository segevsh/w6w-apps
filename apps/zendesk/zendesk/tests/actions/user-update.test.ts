import { assertEquals } from "@std/assert";
import { mockZendeskCtx } from "../_helpers.ts";
import action from "../../actions/user-update.ts";

Deno.test("user-update: PUTs only what changed", async () => {
  const { ctx, calls } = mockZendeskCtx([{ body: { user: {} } }]);
  await action.execute({ userId: 3, suspended: true }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(JSON.parse(calls[0].body!), { user: { suspended: true } });
});

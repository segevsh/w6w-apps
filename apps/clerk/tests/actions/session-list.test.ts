import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/session-list.ts";

Deno.test("session-list: passes userId through and wraps the bare array", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [{ id: "sess_1" }] }]);
  const out = await action.execute!({ userId: "user_1" }, ctx) as { data: unknown[] };
  assertEquals(new URL(calls[0].url).pathname, "/v1/sessions");
  assertEquals(new URL(calls[0].url).searchParams.get("user_id"), "user_1");
  assertEquals(out.data.length, 1);
});

/** Clerk deprecated an unfiltered list; this action enforces the successor requirement itself. */
Deno.test("session-list: refuses when neither userId nor clientId is given", async () => {
  const { ctx, calls } = mockCtx([]);
  const err = await assertRejects(async () => await action.execute!({}, ctx), Error);
  assert(/userId.*clientId|deprecated/.test(String(err)), String(err));
  assertEquals(calls.length, 0);
});

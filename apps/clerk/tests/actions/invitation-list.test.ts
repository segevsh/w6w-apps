import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/invitation-list.ts";

Deno.test("invitation-list: hits GET /invitations and wraps the bare array", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [{ id: "inv_1" }] }]);
  const out = await action.execute!({ status: "pending" }, ctx) as { data: unknown[] };
  assertEquals(new URL(calls[0].url).pathname, "/v1/invitations");
  assertEquals(new URL(calls[0].url).searchParams.get("status"), "pending");
  assertEquals(out.data.length, 1);
});

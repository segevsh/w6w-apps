import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/check-team-password.ts";

Deno.test("check-team-password: POSTs password", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true } }]);
  await action.execute!({ eventId: "e1", teamId: "t1", password: "pw" }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v3/events/e1/teams/t1/check_password/");
  assertEquals(JSON.parse(calls[0].body!), { password: "pw" });
});

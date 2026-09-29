import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/create-team-membership.ts";

Deno.test("create-team-membership: POSTs /team/memberships", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "tm1" } }]);
  await action.execute({ teamId: "t1", personEmail: "jo@acme.test" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://webexapis.com/v1/team/memberships");
  assertEquals(JSON.parse(calls[0].body!), { teamId: "t1", personEmail: "jo@acme.test" });
});

Deno.test("create-team-membership: is not idempotent", () => {
  assertEquals(action.idempotent, false);
});

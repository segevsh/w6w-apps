import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/create-membership.ts";

Deno.test("create-membership: POSTs /memberships by personEmail", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "mb1" } }]);
  await action.execute({ roomId: "r1", personEmail: "jo@acme.test" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://webexapis.com/v1/memberships");
  assertEquals(JSON.parse(calls[0].body!), { roomId: "r1", personEmail: "jo@acme.test" });
});

Deno.test("create-membership: is not idempotent", () => {
  assertEquals(action.idempotent, false);
});

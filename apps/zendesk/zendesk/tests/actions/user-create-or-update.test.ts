import { assert, assertEquals } from "@std/assert";
import { mockZendeskCtx } from "../_helpers.ts";
import action from "../../actions/user-create-or-update.ts";

Deno.test("user-create-or-update: POSTs the upsert route", async () => {
  const { ctx, calls } = mockZendeskCtx([{ body: { user: { id: 1 } } }]);
  await action.execute({ name: "Jo", email: "jo@acme.test" }, ctx);
  assertEquals(calls[0].url, "https://acme.zendesk.com/api/v2/users/create_or_update.json");
});

Deno.test("user-create-or-update: is the idempotent counterpart to user-create", () => {
  assertEquals(action.idempotent, true);
  assert(action.description?.includes("Safe to re-run"));
});

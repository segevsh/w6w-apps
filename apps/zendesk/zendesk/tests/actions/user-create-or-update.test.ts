import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import { mockZendeskCtx } from "../_helpers.ts";
import action from "../../actions/user-create-or-update.ts";

test("user-create-or-update: POSTs the upsert route", async () => {
  const { ctx, calls } = mockZendeskCtx([{ body: { user: { id: 1 } } }]);
  await action.execute({ name: "Jo", email: "jo@acme.test" }, ctx);
  assertEquals(calls[0].url, "https://acme.zendesk.com/api/v2/users/create_or_update.json");
});

test("user-create-or-update: is the idempotent counterpart to user-create", () => {
  assertEquals(action.idempotent, true);
  assert(action.description?.includes("Safe to re-run"));
});

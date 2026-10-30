import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockZendeskCtx } from "../_helpers.ts";
import action from "../../actions/user-create.ts";

test("user-create: POSTs /users.json with the user envelope", async () => {
  const { ctx, calls } = mockZendeskCtx([{ body: { user: { id: 1 } } }]);
  await action.execute({ name: "Jo", email: "jo@acme.test", role: "agent" }, ctx);
  assertEquals(calls[0].url, "https://acme.zendesk.com/api/v2/users.json");
  assertEquals(JSON.parse(calls[0].body!), {
    user: { name: "Jo", email: "jo@acme.test", role: "agent" },
  });
});

test("user-create: is not idempotent — use create-or-update for retries", () => {
  assertEquals(action.idempotent, false);
});

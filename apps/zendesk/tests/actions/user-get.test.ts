import { assertEquals } from "@std/assert";
import { mockZendeskCtx } from "../_helpers.ts";
import action from "../../actions/user-get.ts";

Deno.test("user-get: GETs /users/{id}.json", async () => {
  const { ctx, calls } = mockZendeskCtx([{ body: { user: { id: 3 } } }]);
  await action.execute({ userId: 3 }, ctx);
  assertEquals(calls[0].url, "https://acme.zendesk.com/api/v2/users/3.json");
});

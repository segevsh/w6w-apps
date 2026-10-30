import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockZendeskCtx } from "../_helpers.ts";
import action from "../../actions/organization-get.ts";

test("organization-get: GETs /organizations/{id}.json", async () => {
  const { ctx, calls } = mockZendeskCtx([{ body: { organization: { id: 2 } } }]);
  await action.execute({ organizationId: 2 }, ctx);
  assertEquals(calls[0].url, "https://acme.zendesk.com/api/v2/organizations/2.json");
});

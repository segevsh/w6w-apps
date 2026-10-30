import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockZendeskCtx } from "../_helpers.ts";
import action from "../../actions/organization-create.ts";

test("organization-create: splits the domain list", async () => {
  const { ctx, calls } = mockZendeskCtx([{ body: { organization: { id: 1 } } }]);
  await action.execute({ name: "Acme", domainNames: "acme.test, acme.example" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).organization.domain_names, [
    "acme.test",
    "acme.example",
  ]);
});

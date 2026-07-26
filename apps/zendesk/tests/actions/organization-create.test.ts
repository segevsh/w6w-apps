import { assertEquals } from "@std/assert";
import { mockZendeskCtx } from "../_helpers.ts";
import action from "../../actions/organization-create.ts";

Deno.test("organization-create: splits the domain list", async () => {
  const { ctx, calls } = mockZendeskCtx([{ body: { organization: { id: 1 } } }]);
  await action.execute({ name: "Acme", domainNames: "acme.test, acme.example" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).organization.domain_names, [
    "acme.test",
    "acme.example",
  ]);
});

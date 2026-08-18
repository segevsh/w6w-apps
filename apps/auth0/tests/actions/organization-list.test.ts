import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/organization-list.ts";

const conn = { display: { domain: "acme.us.auth0.com" } };

Deno.test("organization-list: reads the tenant's organizations", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { organizations: [{ id: "org_1" }], total: 1 },
  }], conn);
  const out = await action.execute!({}, ctx) as { organizations: unknown[] };
  assertEquals(out.organizations.length, 1);
  assertEquals(new URL(calls[0].url).pathname, "/api/v2/organizations");
});

Deno.test("organization-list: describes them as the B2B unit", () => {
  assert(/B2B/.test(action.description!), action.description);
});

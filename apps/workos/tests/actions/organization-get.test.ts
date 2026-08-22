import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/organization-get.ts";

/**
 * A domain still pending verification does not route SSO, which is the usual
 * cause of a setup that looks finished and does not work — so it is pulled out
 * of the blob rather than left in it.
 */
Deno.test("organization-get: names the domains that will not route SSO", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: {
      id: "org_1",
      domains: [
        { domain: "acme.com", state: "verified" },
        { domain: "acme.co.uk", state: "pending" },
      ],
    },
  }]);
  const result = await action.execute!({ organizationId: "org_1" }, ctx) as {
    unverifiedDomains: string[];
  };
  assertEquals(calls[0].url, "https://api.workos.com/organizations/org_1");
  assertEquals(result.unverifiedDomains, ["acme.co.uk"]);
});

Deno.test("organization-get: an organization with no domains reports an empty list", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { id: "org_1" } }]);
  const result = await action.execute!({ organizationId: "org_1" }, ctx) as {
    unverifiedDomains: string[];
  };
  assertEquals(result.unverifiedDomains, []);
});

Deno.test("organization-get: requires an id rather than listing everything", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(async () => await action.execute!({}, ctx), Error, "organizationId");
  assertEquals(calls.length, 0);
});

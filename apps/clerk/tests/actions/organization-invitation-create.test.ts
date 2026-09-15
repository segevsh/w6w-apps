import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/organization-invitation-create.ts";

Deno.test("organization-invitation-create: POSTs email + role to the org's invitations", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "orginv_1", status: "pending" } }]);
  await action.execute!({
    organizationId: "org_1",
    emailAddress: "ada@example.com",
    role: "org:member",
  }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1/organizations/org_1/invitations");
  assertEquals(JSON.parse(calls[0].body!), {
    email_address: "ada@example.com",
    role: "org:member",
  });
});

Deno.test("organization-invitation-create: requires an email and a role", async () => {
  const { ctx, calls } = mockCtx([]);
  const err = await assertRejects(
    async () => await action.execute!({ organizationId: "org_1" }, ctx),
    Error,
  );
  assert(/emailAddress/.test(String(err)));
  assertEquals(calls.length, 0);
});

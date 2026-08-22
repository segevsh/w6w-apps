import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/invitation-send.ts";

/** The recipient proves they control the address before they get in. */
Deno.test("invitation-send: posts the invitation with a default expiry", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "invitation_1" } }]);
  await action.execute!({ email: "ada@acme.com", organizationId: "org_1" }, ctx);
  assertEquals(calls[0].url, "https://api.workos.com/user_management/invitations");
  assertEquals(JSON.parse(calls[0].body!), {
    email: "ada@acme.com",
    organization_id: "org_1",
    expires_in_days: 7,
  });
});

Deno.test("invitation-send: the role and inviter reach the wire", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "invitation_1" } }]);
  await action.execute!({
    email: "ada@acme.com",
    organizationId: "org_1",
    roleSlug: "member",
    inviterUserId: "user_9",
    expiresInDays: 14,
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!), {
    email: "ada@acme.com",
    organization_id: "org_1",
    role_slug: "member",
    inviter_user_id: "user_9",
    expires_in_days: 14,
  });
});

Deno.test("invitation-send: an out-of-range expiry is refused before the request", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    async () =>
      await action.execute!({ email: "a@b.com", organizationId: "org_1", expiresInDays: 90 }, ctx),
    Error,
    "between 1 and 30",
  );
  assertEquals(calls.length, 0);
});

Deno.test("invitation-send: logs the invitation, not the person invited", async () => {
  const { ctx, logs } = mockCtx([{ status: 201, body: { id: "invitation_1" } }]);
  await action.execute!({ email: "ada@acme.com", organizationId: "org_1" }, ctx);
  assertEquals(logs[0].data, { invitationId: "invitation_1", organizationId: "org_1" });
});

Deno.test("invitation-send: requires an address and an organization", async () => {
  const noEmail = mockCtx();
  await assertRejects(
    async () => await action.execute!({ organizationId: "org_1" }, noEmail.ctx),
    Error,
    "email",
  );
  const noOrg = mockCtx();
  await assertRejects(
    async () => await action.execute!({ email: "a@b.com" }, noOrg.ctx),
    Error,
    "organizationId",
  );
});

Deno.test("invitation-send: names itself the safe counterpart to a direct grant", () => {
  assert(/instead of granting/.test(action.description!), action.description);
});

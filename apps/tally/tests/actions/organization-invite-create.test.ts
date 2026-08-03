import { assertEquals } from "@std/assert";
import { jsonBody, mockCtx } from "../_helpers.ts";
import action from "../../actions/organization-invite-create.ts";

Deno.test("organization-invite-create: POSTs emails as a string and workspaceIds as an array", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const result = await action.execute({
    organizationId: "org1",
    emails: "a@b.com,c@d.com",
    workspaceIds: ["w1", "w2"],
  }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/organizations/org1/invites");
  // The asymmetry is Tally's, and is reproduced rather than smoothed over.
  assertEquals(jsonBody(calls[0]), {
    emails: "a@b.com,c@d.com",
    workspaceIds: ["w1", "w2"],
  });
  assertEquals(result, { emails: "a@b.com,c@d.com", invited: true });
});

Deno.test("organization-invite-create: is not idempotent", () => {
  assertEquals(action.idempotent, false);
});

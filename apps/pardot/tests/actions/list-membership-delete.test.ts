import { assertEquals, assertRejects } from "@std/assert";
import { mockPardotCtx } from "../_helpers.ts";
import action from "../../actions/list-membership-delete.ts";

Deno.test("list-membership-delete: DELETEs the membership by its own id", async () => {
  const { ctx, calls } = mockPardotCtx([{ status: 204 }]);
  const out = await action.execute({ listMembershipId: 10001 }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(new URL(calls[0].url).pathname, "/api/v5/objects/list-memberships/10001");
  assertEquals(out, { id: 10001, deleted: true });
});

Deno.test("list-membership-delete: a 405 'in use' refusal is an error", async () => {
  const { ctx } = mockPardotCtx([{ status: 405, body: { code: 108, message: "in use" } }]);
  await assertRejects(
    async () => await action.execute({ listMembershipId: 1 }, ctx),
    Error,
    "[108]",
  );
});

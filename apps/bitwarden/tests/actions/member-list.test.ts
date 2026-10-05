import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/member-list.ts";

const D = { display: { region: "us" } };

Deno.test("member-list: names roles and statuses and counts by status", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      object: "list",
      data: [{ id: "3f2b8c1e-5a4d-4e6f-9a1b-7c8d9e0f1a2b", email: "a@x.io", type: 0, status: 2 }, {
        id: "a1b2c3d4-e5f6-4789-8abc-def012345678",
        email: "b@x.io",
        type: 4,
        status: -1,
      }],
    },
  }], D);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(calls[0].url, "https://api.bitwarden.com/public/members");
  assertEquals(result.count, 2);
  assertEquals(result.byStatus, { Confirmed: 1, Revoked: 1 });
  assertEquals((result.members as Array<{ typeName: string }>)[1].typeName, "Custom");
});

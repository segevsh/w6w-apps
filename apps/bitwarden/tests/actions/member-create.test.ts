import { assertEquals, assertMatch, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/member-create.ts";

const D = { display: { region: "us" } };

Deno.test("member-create: POSTs the invite with a numeric role", async () => {
  const { ctx, calls } = mockCtx([{
    body: { id: "a1b2c3d4-e5f6-4789-8abc-def012345678", email: "new@x.io", type: 4, status: 0 },
  }], D);
  const result = await action.execute({
    email: "new@x.io",
    type: "4",
    permissions: '{"manageUsers":true}',
    groups: "3f2b8c1e-5a4d-4e6f-9a1b-7c8d9e0f1a2b",
  }, ctx) as Record<string, unknown>;
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.bitwarden.com/public/members");
  assertEquals(JSON.parse(calls[0].body!), {
    email: "new@x.io",
    type: 4,
    permissions: { manageUsers: true },
    groups: ["3f2b8c1e-5a4d-4e6f-9a1b-7c8d9e0f1a2b"],
  });
  assertEquals(result.statusName, "Invited");
});

Deno.test("member-create: rejects the non-existent role 3", async () => {
  const { ctx } = mockCtx([], D);
  const err = await assertRejects(async () =>
    await action.execute({ email: "a@x.io", type: 3 }, ctx)
  );
  assertMatch((err as Error).message, /must be one of/);
});

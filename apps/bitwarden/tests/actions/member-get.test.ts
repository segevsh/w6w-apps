import { assertEquals, assertMatch, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/member-get.ts";

const D = { display: { region: "us" } };

Deno.test("member-get: GETs the member", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      id: "3f2b8c1e-5a4d-4e6f-9a1b-7c8d9e0f1a2b",
      userId: "a1b2c3d4-e5f6-4789-8abc-def012345678",
      email: "a@x.io",
      type: 1,
      status: 0,
      twoFactorEnabled: false,
    },
  }], D);
  const result = await action.execute(
    { memberId: "3f2b8c1e-5a4d-4e6f-9a1b-7c8d9e0f1a2b" },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(
    calls[0].url,
    "https://api.bitwarden.com/public/members/3f2b8c1e-5a4d-4e6f-9a1b-7c8d9e0f1a2b",
  );
  assertEquals(result.typeName, "Admin");
  assertEquals(result.statusName, "Invited");
});

Deno.test("member-get: rejects an id that is not a UUID before any request", async () => {
  const { ctx, calls } = mockCtx([], D);
  const err = await assertRejects(async () =>
    await action.execute({
      memberId: "not-a-uuid",
      type: 2,
      name: "x",
      memberIds: "",
      groupIds: "",
      enabled: true,
    }, ctx)
  );
  assertMatch((err as Error).message, /must be a UUID/);
  assertEquals(calls.length, 0);
});

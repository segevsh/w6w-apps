import { assertEquals, assertMatch, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/member-update.ts";

const D = { display: { region: "us" } };

Deno.test("member-update: PUTs the role", async () => {
  const { ctx, calls } = mockCtx([{
    body: { id: "3f2b8c1e-5a4d-4e6f-9a1b-7c8d9e0f1a2b", email: "a@x.io", type: 1, status: 2 },
  }], D);
  const result = await action.execute(
    { memberId: "3f2b8c1e-5a4d-4e6f-9a1b-7c8d9e0f1a2b", type: 1 },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(calls[0].method, "PUT");
  assertEquals(
    calls[0].url,
    "https://api.bitwarden.com/public/members/3f2b8c1e-5a4d-4e6f-9a1b-7c8d9e0f1a2b",
  );
  assertEquals(JSON.parse(calls[0].body!), { type: 1 });
  assertEquals(result.typeName, "Admin");
});

Deno.test("member-update: requires a role", async () => {
  const { ctx } = mockCtx([], D);
  const err = await assertRejects(async () =>
    await action.execute({ memberId: "3f2b8c1e-5a4d-4e6f-9a1b-7c8d9e0f1a2b" }, ctx)
  );
  assertMatch((err as Error).message, /`type`/);
});

Deno.test("member-update: rejects an id that is not a UUID before any request", async () => {
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

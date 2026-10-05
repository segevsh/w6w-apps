import { assertEquals, assertMatch, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/group-member-ids-get.ts";

const D = { display: { region: "us" } };

Deno.test("group-member-ids-get: returns the bare array as memberIds", async () => {
  const { ctx, calls } = mockCtx([{
    body: ["3f2b8c1e-5a4d-4e6f-9a1b-7c8d9e0f1a2b", "a1b2c3d4-e5f6-4789-8abc-def012345678"],
  }], D);
  const result = await action.execute(
    { groupId: "3f2b8c1e-5a4d-4e6f-9a1b-7c8d9e0f1a2b" },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(
    calls[0].url,
    "https://api.bitwarden.com/public/groups/3f2b8c1e-5a4d-4e6f-9a1b-7c8d9e0f1a2b/member-ids",
  );
  assertEquals(result.count, 2);
});

Deno.test("group-member-ids-get: rejects an id that is not a UUID before any request", async () => {
  const { ctx, calls } = mockCtx([], D);
  const err = await assertRejects(async () =>
    await action.execute({
      groupId: "not-a-uuid",
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

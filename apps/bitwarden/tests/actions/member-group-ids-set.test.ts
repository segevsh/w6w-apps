import { assertEquals, assertMatch, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/member-group-ids-set.ts";

const D = { display: { region: "us" } };

Deno.test("member-group-ids-set: PUTs the group id list", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: "" }], D);
  await action.execute({
    memberId: "3f2b8c1e-5a4d-4e6f-9a1b-7c8d9e0f1a2b",
    groupIds: ["a1b2c3d4-e5f6-4789-8abc-def012345678"],
  }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(JSON.parse(calls[0].body!), { groupIds: ["a1b2c3d4-e5f6-4789-8abc-def012345678"] });
});

Deno.test("member-group-ids-set: rejects an id that is not a UUID before any request", async () => {
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

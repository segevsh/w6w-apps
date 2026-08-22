import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/user-group-member-set.ts";

const display = { display: { region: "us" } };
const STATIC_GROUP = { status: 200, body: { id: "g1", name: "Engineering" } };

Deno.test("user-group-member-set: checks the group, then POSTs the graph operation", async () => {
  const { ctx, calls } = mockCtx([STATIC_GROUP, { status: 204 }], display);
  const result = await action.execute!({ groupId: "g1", userId: "u1", op: "add" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/v2/usergroups/g1");
  assertEquals(new URL(calls[1].url).pathname, "/api/v2/usergroups/g1/members");
  assertEquals(JSON.parse(calls[1].body!), { op: "add", type: "user", id: "u1" });
  assertEquals(result, { groupId: "g1", userId: "u1", op: "add", applied: true });
});

Deno.test("user-group-member-set: remove is the revoke half of offboarding", async () => {
  const { ctx, calls } = mockCtx([STATIC_GROUP, { status: 204 }], display);
  await action.execute!({ groupId: "g1", userId: "u1", op: "remove" }, ctx);
  assertEquals(JSON.parse(calls[1].body!).op, "remove");
});

/**
 * A dynamic group recomputes its own membership, so JumpCloud accepts the write
 * and then undoes it. Failing loudly beats appearing to work.
 */
Deno.test("user-group-member-set: refuses a dynamic group by default", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { id: "g1", memberQuery: { filters: [] } },
  }], display);
  await assertRejects(
    async () => await action.execute!({ groupId: "g1", userId: "u1", op: "add" }, ctx),
    Error,
    "this group is DYNAMIC",
  );
  // The lookup happened; the write did not.
  assertEquals(calls.length, 1);
});

Deno.test("user-group-member-set: the dynamic guard can be overridden deliberately", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }], display);
  await action.execute!({ groupId: "g1", userId: "u1", op: "add", allowDynamic: true }, ctx);
  // With the override there is no lookup at all — one call, straight to the write.
  assertEquals(calls.length, 1);
  assertEquals(new URL(calls[0].url).pathname, "/api/v2/usergroups/g1/members");
});

/** JumpCloud answers 204 whether or not anything changed. */
Deno.test("user-group-member-set: the output does not claim to know what changed", () => {
  const outputs = action.output as Array<{ key: string; label: string }>;
  assert(outputs.find((o) => o.key === "applied")!.label.includes("204 either way"));
});

Deno.test("user-group-member-set: every field is validated before any request", async () => {
  for (
    const [input, needle] of [
      [{ userId: "u1" }, "`groupId`"],
      [{ groupId: "g1" }, "`userId`"],
      [{ groupId: "g1", userId: "u1", op: "update" }, "`op` must be"],
    ] as const
  ) {
    const { ctx, calls } = mockCtx([], display);
    await assertRejects(async () => await action.execute!(input, ctx), Error, needle);
    assertEquals(calls.length, 0);
  }
});

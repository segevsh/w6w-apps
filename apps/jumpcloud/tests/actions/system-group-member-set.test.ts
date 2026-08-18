import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/system-group-member-set.ts";

const display = { display: { region: "us" } };

/** The two membership endpoints share a body whose `type` is a const each. */
Deno.test("system-group-member-set: sends type `system`, not `user`", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }], display);
  const result = await action.execute!({ groupId: "sg1", systemId: "s1", op: "add" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/v2/systemgroups/sg1/members");
  assertEquals(JSON.parse(calls[0].body!), { op: "add", type: "system", id: "s1" });
  assertEquals(result, { groupId: "sg1", systemId: "s1", op: "add", applied: true });
});

Deno.test("system-group-member-set: remove stops applying the group's policies", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }], display);
  await action.execute!({ groupId: "sg1", systemId: "s1", op: "remove" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).op, "remove");
});

Deno.test("system-group-member-set: the output does not claim to know what changed", () => {
  const outputs = action.output as Array<{ key: string; label: string }>;
  assert(outputs.find((o) => o.key === "applied")!.label.includes("204 either way"));
});

Deno.test("system-group-member-set: every field is validated before any request", async () => {
  for (
    const [input, needle] of [
      [{ systemId: "s1" }, "`groupId`"],
      [{ groupId: "sg1" }, "`systemId`"],
      [{ groupId: "sg1", systemId: "s1", op: "update" }, "`op` must be"],
    ] as const
  ) {
    const { ctx, calls } = mockCtx([], display);
    await assertRejects(async () => await action.execute!(input, ctx), Error, needle);
    assertEquals(calls.length, 0);
  }
});

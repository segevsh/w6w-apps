import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/user-group-delete.ts";

const display = { display: { region: "us" } };

/** A group is the edge that grants access, so deleting it revokes everything. */
Deno.test("user-group-delete: refuses to run without an explicit confirmation", async () => {
  const { ctx, calls } = mockCtx([], display);
  await assertRejects(
    async () => await action.execute!({ groupId: "g1" }, ctx),
    Error,
    "revokes everything it granted",
  );
  assertEquals(calls.length, 0);
});

Deno.test("user-group-delete: with confirmation it DELETEs on the V2 base", async () => {
  const { ctx, calls, logs } = mockCtx([{ status: 204 }], display);
  const result = await action.execute!({ groupId: "g1", confirm: true }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(new URL(calls[0].url).pathname, "/api/v2/usergroups/g1");
  assertEquals(result, { groupId: "g1", deleted: true });
  assertEquals(logs[0].level, "warn");
});

Deno.test("user-group-delete: the description names what is lost", () => {
  assert(action.description!.includes("access binding"), action.description);
});

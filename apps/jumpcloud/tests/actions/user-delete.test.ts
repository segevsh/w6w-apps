import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/user-delete.ts";

const display = { display: { region: "us" } };

/** Deleting is not suspending, and JumpCloud has no undelete. */
Deno.test("user-delete: refuses to run without an explicit confirmation", async () => {
  const { ctx, calls } = mockCtx([], display);
  await assertRejects(
    async () => await action.execute!({ userId: "u1" }, ctx),
    Error,
    "`confirm` must be true",
  );
  assertEquals(calls.length, 0);
});

Deno.test("user-delete: with confirmation it DELETEs and logs at warn", async () => {
  const { ctx, calls, logs } = mockCtx([{ status: 200 }], display);
  const result = await action.execute!({ userId: "u1", confirm: true }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(new URL(calls[0].url).pathname, "/api/systemusers/u1");
  assertEquals(result, { userId: "u1", deleted: true });
  assertEquals(logs[0].level, "warn");
});

Deno.test("user-delete: points at suspending as the usual offboarding verb", () => {
  assert(action.description!.includes("Suspending"), action.description);
});

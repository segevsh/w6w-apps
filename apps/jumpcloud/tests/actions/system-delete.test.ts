import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/system-delete.ts";

const display = { display: { region: "us" } };

Deno.test("system-delete: refuses to run without an explicit confirmation", async () => {
  const { ctx, calls } = mockCtx([], display);
  await assertRejects(
    async () => await action.execute!({ systemId: "s1" }, ctx),
    Error,
    "`confirm` must be true",
  );
  assertEquals(calls.length, 0);
});

Deno.test("system-delete: with confirmation it DELETEs and logs at warn", async () => {
  const { ctx, calls, logs } = mockCtx([{ status: 200 }], display);
  const result = await action.execute!({ systemId: "s1", confirm: true }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(new URL(calls[0].url).pathname, "/api/systems/s1");
  assertEquals(result, { systemId: "s1", deleted: true });
  assertEquals(logs[0].level, "warn");
});

/** Unenrolling is not wiping — that is a different action entirely. */
Deno.test("system-delete: says plainly that it does not wipe the machine", () => {
  assert(action.description!.includes("Does not wipe"), action.description);
});

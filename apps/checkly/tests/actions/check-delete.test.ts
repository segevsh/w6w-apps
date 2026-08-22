import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/check-delete.ts";

Deno.test("check-delete: refuses to run without an explicit confirmation", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await action.execute!({ checkId: "c1" }, ctx),
    Error,
    "deletes its result history",
  );
  assertEquals(calls.length, 0);
});

Deno.test("check-delete: with confirmation it DELETEs, logging at warn", async () => {
  const { ctx, calls, logs } = mockCtx([{ status: 204 }]);
  const result = await action.execute!({ checkId: "c1", confirm: true }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(calls[0].url, "https://api.checklyhq.com/v1/checks/c1");
  assertEquals(result, { checkId: "c1", deleted: true });
  assertEquals(logs[0].level, "warn");
});

Deno.test("check-delete: points at deactivating as the reversible option", () => {
  assert(action.description!.includes("Deactivating keeps both"), action.description);
});

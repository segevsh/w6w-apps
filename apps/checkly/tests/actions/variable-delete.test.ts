import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/variable-delete.ts";

/** A script reading a missing variable often passes while testing nothing. */
Deno.test("variable-delete: refuses to run without an explicit confirmation", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await action.execute!({ key: "BASE_URL" }, ctx),
    Error,
    "may pass while testing nothing",
  );
  assertEquals(calls.length, 0);
});

Deno.test("variable-delete: with confirmation it DELETEs, logging at warn", async () => {
  const { ctx, calls, logs } = mockCtx([{ status: 204 }]);
  const result = await action.execute!({ key: "BASE_URL", confirm: true }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(calls[0].url, "https://api.checklyhq.com/v1/variables/BASE_URL");
  assertEquals(result, { key: "BASE_URL", deleted: true });
  assertEquals(logs[0].level, "warn");
});

Deno.test("variable-delete: a blank key fails before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await action.execute!({ confirm: true }, ctx),
    Error,
    "`key` is required",
  );
  assertEquals(calls.length, 0);
  assert(action.description!.includes("keep passing"), action.description);
});

import { test } from "node:test";
import { assert, assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/flag-delete.ts";

const conn = { display: { projectKey: "default" } };

/** Archiving has the same effect on evaluation and is reversible. */
test("flag-delete: refuses to run without an explicit confirmation", async () => {
  const { ctx, calls } = mockCtx([], conn);
  await assertRejects(
    async () => await action.execute!({ flagKey: "f" }, ctx),
    Error,
    "archiving is reversible",
  );
  assertEquals(calls.length, 0);
});

test("flag-delete: with confirmation it DELETEs, logging at warn", async () => {
  const { ctx, calls, logs } = mockCtx([{ status: 204 }], conn);
  const result = await action.execute!({ flagKey: "f", confirm: true }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(calls[0].url, "https://app.launchdarkly.com/api/v2/flags/default/f");
  assertEquals(result, { flagKey: "f", deleted: true });
  assertEquals(logs[0].level, "warn");
});

test("flag-delete: points at archiving as the reversible option", () => {
  assert(action.description!.includes("Archiving is the reversible"), action.description);
});

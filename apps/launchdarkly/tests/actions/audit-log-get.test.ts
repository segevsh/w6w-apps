import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/audit-log-get.ts";

const conn = { display: {} };

/** The before/after diff is what the list omits and a review wants. */
Deno.test("audit-log-get: reads one entry", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { _id: "a1", previousVersion: {}, currentVersion: {} },
  }], conn);
  const result = await action.execute!({ entryId: "a1" }, ctx) as Record<string, unknown>;
  assertEquals(calls[0].url, "https://app.launchdarkly.com/api/v2/auditlog/a1");
  assertEquals(result._id, "a1");
});

Deno.test("audit-log-get: the outputs name the before and after states", () => {
  const outputs = action.output as Array<{ key: string; label: string }>;
  assert(outputs.some((o) => o.key === "previousVersion"));
  assert(outputs.some((o) => o.key === "currentVersion"));
});

Deno.test("audit-log-get: a blank id fails before any request", async () => {
  const { ctx, calls } = mockCtx([], conn);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`entryId`");
  assertEquals(calls.length, 0);
});

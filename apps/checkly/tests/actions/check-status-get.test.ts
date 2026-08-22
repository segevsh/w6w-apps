import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/check-status-get.ts";

Deno.test("check-status-get: reads one check's current state", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { checkId: "c1", hasFailures: true, hasErrors: false },
  }]);
  const result = await action.execute!({ checkId: "c1" }, ctx) as Record<string, unknown>;
  assertEquals(calls[0].url, "https://api.checklyhq.com/v1/check-statuses/c1");
  assertEquals(result.hasFailures, true);
});

/** A failure and an error are different events with different causes. */
Deno.test("check-status-get: the outputs distinguish failures from errors", () => {
  const outputs = action.output as Array<{ key: string; label: string }>;
  assert(outputs.find((o) => o.key === "hasFailures")!.label.includes("monitored thing"));
  assert(outputs.find((o) => o.key === "hasErrors")!.label.includes("did not complete"));
});

Deno.test("check-status-get: a blank id fails before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`checkId`");
  assertEquals(calls.length, 0);
});

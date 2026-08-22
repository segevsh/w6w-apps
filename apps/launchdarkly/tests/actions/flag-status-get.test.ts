import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/flag-status-get.ts";

const conn = { display: { projectKey: "default", environmentKey: "production" } };

/** The question a cleanup workflow needs, which the flag object cannot answer. */
Deno.test("flag-status-get: reads the evaluation status", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { name: "launched" } }], conn);
  const result = await action.execute!({ flagKey: "f" }, ctx) as Record<string, unknown>;
  assertEquals(
    calls[0].url,
    "https://app.launchdarkly.com/api/v2/flag-statuses/default/production/f",
  );
  assertEquals(result.name, "launched");
});

Deno.test("flag-status-get: the output names the four states", () => {
  const outputs = action.output as Array<{ key: string; label: string }>;
  assert(outputs.find((o) => o.key === "name")!.label.includes("launched"));
});

Deno.test("flag-status-get: a blank key fails before any request", async () => {
  const { ctx, calls } = mockCtx([], conn);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`flagKey`");
  assertEquals(calls.length, 0);
});

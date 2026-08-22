import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/segment-get.ts";

const conn = { display: { projectKey: "default", environmentKey: "production" } };

Deno.test("segment-get: reads one segment", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { key: "beta", included: ["u1"], excluded: ["u2"] },
  }], conn);
  const result = await action.execute!({ segmentKey: "beta" }, ctx) as Record<string, unknown>;
  assertEquals(
    calls[0].url,
    "https://app.launchdarkly.com/api/v2/segments/default/production/beta",
  );
  assertEquals(result.excluded, ["u2"]);
});

/** An explicit exclusion beats a matching rule. */
Deno.test("segment-get: the output says exclusion wins over a rule", () => {
  const outputs = action.output as Array<{ key: string; label: string }>;
  assert(outputs.find((o) => o.key === "excluded")!.label.includes("beats a matching rule"));
});

Deno.test("segment-get: a blank key fails before any request", async () => {
  const { ctx, calls } = mockCtx([], conn);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`segmentKey`");
  assertEquals(calls.length, 0);
});

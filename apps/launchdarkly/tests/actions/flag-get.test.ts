import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/flag-get.ts";

const conn = { display: { projectKey: "default" } };

Deno.test("flag-get: reads one flag", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { key: "f", environments: { production: { on: true } } },
  }], conn);
  const result = await action.execute!({ flagKey: "f" }, ctx) as Record<string, unknown>;
  assertEquals(calls[0].url, "https://app.launchdarkly.com/api/v2/flags/default/f");
  assertEquals((result.environments as Record<string, { on: boolean }>).production.on, true);
});

/** There is no single "is this flag on" answer — it is per environment. */
Deno.test("flag-get: the output says `on` alone is not the answer", () => {
  const outputs = action.output as Array<{ key: string; label: string }>;
  assert(
    outputs.find((o) => o.key === "environments")!.label.includes("does not say what users get"),
  );
});

Deno.test("flag-get: a blank key fails before any request", async () => {
  const { ctx, calls } = mockCtx([], conn);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`flagKey`");
  assertEquals(calls.length, 0);
});

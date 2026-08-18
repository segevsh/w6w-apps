import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { SEMANTIC_PATCH_CONTENT_TYPE } from "../../lib/client.ts";
import action from "../../actions/segment-update.ts";

const conn = { display: { projectKey: "default", environmentKey: "production" } };

Deno.test("segment-update: turns the add and remove fields into instructions", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { key: "s" } }], conn);
  await action.execute!({ segmentKey: "s", addKeys: "u1, u2", removeKeys: "u3" }, ctx);
  assertEquals(
    calls[0].url,
    "https://app.launchdarkly.com/api/v2/segments/default/production/s",
  );
  assertEquals(calls[0].headers["content-type"], SEMANTIC_PATCH_CONTENT_TYPE);
  assertEquals(JSON.parse(calls[0].body!).instructions, [
    { kind: "addIncludedTargets", values: ["u1", "u2"] },
    { kind: "removeIncludedTargets", values: ["u3"] },
  ]);
});

Deno.test("segment-update: extra instructions are merged after the two fields", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], conn);
  await action.execute!({
    segmentKey: "s",
    addKeys: "u1",
    instructions: '[{"kind":"addExcludedTargets","values":["u9"]}]',
  }, ctx);
  const instructions = JSON.parse(calls[0].body!).instructions;
  assertEquals(instructions.length, 2);
  assertEquals(instructions[1].kind, "addExcludedTargets");
});

Deno.test("segment-update: a change with nothing set is refused, not sent", async () => {
  const { ctx, calls } = mockCtx([], conn);
  await assertRejects(
    async () => await action.execute!({ segmentKey: "s" }, ctx),
    Error,
    "nothing to change",
  );
  assertEquals(calls.length, 0);
});

Deno.test("segment-update: a non-array instructions value is refused", async () => {
  const { ctx, calls } = mockCtx([], conn);
  await assertRejects(
    async () => await action.execute!({ segmentKey: "s", instructions: '{"kind":"x"}' }, ctx),
    Error,
    "must be an array",
  );
  assertEquals(calls.length, 0);
});

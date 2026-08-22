import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { SEMANTIC_PATCH_CONTENT_TYPE } from "../../lib/client.ts";
import action from "../../actions/flag-update.ts";

const conn = { display: { projectKey: "default", environmentKey: "production" } };

Deno.test("flag-update: passes instructions through as a semantic patch", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { key: "f" } }], conn);
  await action.execute!({
    flagKey: "f",
    instructions: '[{"kind":"addTags","values":["checkout"]}]',
  }, ctx);
  assertEquals(calls[0].headers["content-type"], SEMANTIC_PATCH_CONTENT_TYPE);
  assertEquals(JSON.parse(calls[0].body!).instructions, [
    { kind: "addTags", values: ["checkout"] },
  ]);
});

/** The environment is only sent when the caller names one. */
Deno.test("flag-update: the environment is optional here, unlike on toggle", async () => {
  const without = mockCtx([{ status: 200, body: {} }], conn);
  await action.execute!(
    { flagKey: "f", instructions: '[{"kind":"addTags","values":["x"]}]' },
    without.ctx,
  );
  assertEquals(JSON.parse(without.calls[0].body!).environmentKey, undefined);

  const with_ = mockCtx([{ status: 200, body: {} }], conn);
  await action.execute!({
    flagKey: "f",
    instructions: '[{"kind":"addTags","values":["x"]}]',
    environmentKey: "staging",
  }, with_.ctx);
  assertEquals(JSON.parse(with_.calls[0].body!).environmentKey, "staging");
});

Deno.test("flag-update: every instruction must carry a kind", async () => {
  const { ctx, calls } = mockCtx([], conn);
  await assertRejects(
    async () => await action.execute!({ flagKey: "f", instructions: '[{"values":["x"]}]' }, ctx),
    Error,
    "instruction 0 has no `kind`",
  );
  assertEquals(calls.length, 0);
});

Deno.test("flag-update: an empty or non-array instruction list is refused", async () => {
  for (const instructions of ["[]", '{"kind":"addTags"}']) {
    const { ctx, calls } = mockCtx([], conn);
    await assertRejects(
      async () => await action.execute!({ flagKey: "f", instructions }, ctx),
      Error,
      "`instructions` is required",
    );
    assertEquals(calls.length, 0);
  }
});

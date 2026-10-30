import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import { BASE, display } from "./_shared.ts";
import action from "../../actions/model-copy.ts";

test("model-copy: posts source and destination to /api/copy", async () => {
  const { ctx, calls } = mockCtx([{ status: 200 }], { display });
  const result = await action.execute!({ source: "llama3.2:3b", destination: "my-llama" }, ctx);
  assertEquals(calls[0].url, `${BASE}/api/copy`);
  assertEquals(JSON.parse(calls[0].body!), { source: "llama3.2:3b", destination: "my-llama" });
  assertEquals(result, { copied: true, source: "llama3.2:3b", destination: "my-llama" });
});

test("model-copy: both names are required", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ source: "a" }, ctx),
    Error,
    "`destination`",
  );
  await assertRejects(
    async () => await action.execute!({ destination: "b" }, ctx),
    Error,
    "`source`",
  );
  assertEquals(calls.length, 0);
});

import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/index-configure.ts";

test("index-configure: PATCHes only what changed", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { name: "idx" } }]);
  await action.execute!({ indexName: "idx", deletionProtection: "enabled" }, ctx);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(JSON.parse(calls[0].body!), { deletion_protection: "enabled" });
});

test("index-configure: read/write parameters nest under embed", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute!({ indexName: "idx", readParameters: '{"input_type":"query"}' }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { embed: { read_parameters: { input_type: "query" } } });
});

test("index-configure: an empty change is refused rather than sent", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    async () => await action.execute!({ indexName: "idx" }, ctx),
    Error,
    "nothing",
  );
  assertEquals(calls.length, 0);
});

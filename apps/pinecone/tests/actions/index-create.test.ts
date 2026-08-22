import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/index-create.ts";

Deno.test("index-create: builds a serverless spec, never a pod one", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { name: "idx" } }]);
  await action.execute!(
    { name: "idx", cloud: "aws", region: "us-east-1", dimension: 1536 },
    ctx,
  );
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.spec, { serverless: { cloud: "aws", region: "us-east-1" } });
  assertEquals(sent.dimension, 1536);
  assertEquals(sent.metric, "cosine");
  assertEquals(sent.deletion_protection, "disabled");
});

/** A sparse index has no dimension and must use dot product. */
Deno.test("index-create: sparse rules are enforced before the call", async () => {
  const withDim = mockCtx();
  await assertRejects(
    async () =>
      await action.execute!(
        { name: "i", cloud: "aws", region: "us-east-1", vectorType: "sparse", dimension: 100 },
        withDim.ctx,
      ),
    Error,
    "no `dimension`",
  );

  const wrongMetric = mockCtx();
  await assertRejects(
    async () =>
      await action.execute!(
        { name: "i", cloud: "aws", region: "us-east-1", vectorType: "sparse", metric: "cosine" },
        wrongMetric.ctx,
      ),
    Error,
    "dotproduct",
  );
  assertEquals(withDim.calls.length + wrongMetric.calls.length, 0);
});

Deno.test("index-create: a sparse index defaults to dotproduct and sends no dimension", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { name: "i" } }]);
  await action.execute!(
    { name: "i", cloud: "aws", region: "us-east-1", vectorType: "sparse" },
    ctx,
  );
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.metric, "dotproduct");
  assertEquals("dimension" in sent, false);
});

Deno.test("index-create: a dense index without a dimension is refused", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    async () =>
      await action.execute!({ name: "i", cloud: "aws", region: "us-east-1", dimension: "" }, ctx),
    Error,
    "dimension",
  );
  assertEquals(calls.length, 0);
});

Deno.test("index-create: deletion protection maps onto Pinecone's enum", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }]);
  await action.execute!(
    { name: "i", cloud: "aws", region: "us-east-1", dimension: 8, deletionProtection: true },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!).deletion_protection, "enabled");
});

Deno.test("index-create: the dimension hint says it is permanent", () => {
  const p = (action.params as Array<{ key: string; hint?: string }>)
    .find((p) => p.key === "dimension")!;
  assert(/cannot be changed/.test(p.hint!), p.hint);
  assertEquals(action.idempotent, false);
});

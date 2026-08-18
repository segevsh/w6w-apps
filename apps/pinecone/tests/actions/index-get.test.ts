import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/index-get.ts";

Deno.test("index-get: describes the index on the control plane", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { name: "idx", host: "idx-abc.svc.aped-1.pinecone.io" },
  }]);
  const out = await action.execute!({ indexName: "idx" }, ctx) as { host: string };
  assertEquals(out.host, "idx-abc.svc.aped-1.pinecone.io");
  assertEquals(new URL(calls[0].url).host, "api.pinecone.io");
  assertEquals(new URL(calls[0].url).pathname, "/indexes/idx");
});

Deno.test("index-get: a missing name is refused", async () => {
  const { ctx } = mockCtx();
  await assertRejects(async () => await action.execute!({}, ctx), Error, "indexName");
});

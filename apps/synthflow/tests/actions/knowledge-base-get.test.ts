import { assertEquals } from "@std/assert";
import knowledgeBaseGet from "../../actions/knowledge-base-get.ts";
import { mockCtx, ok, pathOf } from "../_helpers.ts";

Deno.test("knowledge-base-get: GET /knowledge_base/{id} unwraps the array", async () => {
  const { ctx, calls } = mockCtx([{
    body: ok({ total_records: 1, knowledge_bases: [{ id: "k1" }] }),
  }]);
  const out = await knowledgeBaseGet.execute({ id: "k1" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/knowledge_base/k1");
  assertEquals(out, { knowledge_base: { id: "k1" } });
});

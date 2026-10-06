import { assertEquals } from "@std/assert";
import knowledgeBaseList from "../../actions/knowledge-base-list.ts";
import { mockCtx, ok, pathOf } from "../_helpers.ts";

Deno.test("knowledge-base-list: the paging block is just total_records", async () => {
  const { ctx, calls } = mockCtx([{
    body: ok({ total_records: 1, knowledge_bases: [{ id: "k1" }] }),
  }]);
  const out = await knowledgeBaseList.execute({}, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/knowledge_base");
  assertEquals(out, { items: [{ id: "k1" }], pagination: { total_records: 1 } });
});

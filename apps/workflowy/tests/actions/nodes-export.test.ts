import { assertEquals, assertRejects } from "@std/assert";
import nodesExport from "../../actions/nodes-export.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

const node = (id: string, priority: number) => ({
  id,
  parent_id: null,
  name: id,
  note: null,
  priority,
  completed: false,
});

Deno.test("nodes-export: returns the flat list and a count", async () => {
  const { ctx, calls } = mockCtx([{ body: { nodes: [node("a", 1), node("b", 2)] } }]);
  const out = await nodesExport.execute({}, ctx) as { count: number };
  assertEquals(out.count, 2);
  assertEquals(pathOf(calls[0].url), "/api/v1/nodes-export");
});

Deno.test("nodes-export: a rate-limit refusal surfaces the vendor message", async () => {
  const { ctx } = mockCtx([{ status: 429, body: { errors: "Rate limit exceeded" } }]);
  await assertRejects(async () => await nodesExport.execute({}, ctx), Error, "429");
});

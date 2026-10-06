import { assertEquals, assertRejects } from "@std/assert";
import nodeGet from "../../actions/node-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

const node = (id: string, priority: number) => ({
  id,
  parent_id: null,
  name: id,
  note: null,
  priority,
  completed: false,
});

Deno.test("node-get: unwraps {node} and encodes the id", async () => {
  const { ctx, calls } = mockCtx([{ body: { node: node("n1", 100) } }]);
  const out = await nodeGet.execute({ id: "2026-01-15" }, ctx) as { id: string };
  assertEquals(out.id, "n1");
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v1/nodes/2026-01-15");
});

Deno.test("node-get: a body without node is an error", async () => {
  const { ctx } = mockCtx([{ body: {} }]);
  await assertRejects(async () => await nodeGet.execute({ id: "x" }, ctx), Error, "no node");
});

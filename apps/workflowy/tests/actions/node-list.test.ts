import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import nodeList from "../../actions/node-list.ts";
import { mockCtx, queryOf } from "../_helpers.ts";

const node = (id: string, priority: number) => ({
  id,
  parent_id: null,
  name: id,
  note: null,
  priority,
  completed: false,
});

test("node-list: sorts unordered children by priority and sends parent_id", async () => {
  const { ctx, calls } = mockCtx([{
    body: { nodes: [node("b", 300), node("a", 100), node("c", 200)] },
  }]);
  const out = await nodeList.execute({ parent_id: "inbox" }, ctx) as {
    nodes: Array<{ id: string }>;
    count: number;
  };
  assertEquals(out.nodes.map((n) => n.id), ["a", "c", "b"]);
  assertEquals(out.count, 3);
  assertEquals(queryOf(calls[0].url), { parent_id: "inbox" });
});

test("node-list: no nodes gives an empty list", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  const out = await nodeList.execute({}, ctx) as { count: number };
  assertEquals(out.count, 0);
  assertEquals(calls[0].url.includes("?"), false);
});

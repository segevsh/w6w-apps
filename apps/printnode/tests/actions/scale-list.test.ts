import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import scaleList from "../../actions/scale-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("scale-list: GET /computer/{id}/scales (singular computer)", async () => {
  const { ctx, calls } = mockCtx([{
    body: [{ deviceName: "PrintNode Test Scale", mass: [779000000, null] }],
  }]);
  const out = await scaleList.execute({ computerId: 0 }, ctx) as { count: number };
  assertEquals(pathOf(calls[0].url), "/computer/0/scales");
  assertEquals(out.count, 1);
});

test("scale-list: device name is escaped into the path", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  const out = await scaleList.execute({ computerId: 12, deviceName: "PrintNode Test Scale" }, ctx);
  assertEquals(
    calls[0].url,
    "https://api.printnode.com/computer/12/scales/PrintNode%20Test%20Scale",
  );
  assertEquals(out, { items: [], count: 0 });
});

test("scale-list: a fractional computer id is refused", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(
    async () => await scaleList.execute({ computerId: 1.5 }, ctx),
    Error,
    "whole number",
  );
});

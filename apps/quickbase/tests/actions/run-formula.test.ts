import { assert, assertEquals } from "@std/assert";
import { mockQbCtx } from "../_helpers.ts";
import action from "../../actions/run-formula.ts";

const body = (raw: string | null) => JSON.parse(raw!);

Deno.test("run-formula: posts `from`, `formula` and `rid`", async () => {
  // The record id is named `rid` on the wire, not `recordId`.
  const { ctx, calls } = mockQbCtx([{ body: { result: "42" } }]);
  const out = await action.execute(
    { tableId: "bck1", formula: "[Price]*[Qty]", recordId: 7 },
    ctx,
  );

  assertEquals(new URL(calls[0].url).pathname, "/v1/formula/run");
  assertEquals(body(calls[0].body), { from: "bck1", formula: "[Price]*[Qty]", rid: 7 });
  assertEquals(out.result, "42");
});

Deno.test("run-formula: omits rid for a formula with no field references", async () => {
  const { ctx, calls } = mockQbCtx([{ body: { result: "ok" } }]);
  await action.execute({ tableId: "bck1", formula: '"ok"' }, ctx);
  assert(!("rid" in body(calls[0].body)));
});

Deno.test("run-formula: the result is a string even for a numeric formula", async () => {
  const { ctx } = mockQbCtx([{ body: { result: "42" } }]);
  const out = await action.execute({ tableId: "bck1", formula: "1+41" }, ctx);
  assertEquals(typeof out.result, "string");
});

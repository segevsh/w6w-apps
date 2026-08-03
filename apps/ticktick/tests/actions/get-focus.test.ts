import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-focus.ts";

Deno.test("get-focus: GETs /focus/{id} with the required type query parameter", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "focus-1", type: 0 } }]);
  const out = await action.execute!({ focusId: "focus-1", type: 0 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "GET");
  assertEquals(url.pathname, "/open/v1/focus/focus-1");
  assertEquals(url.searchParams.get("type"), "0");
  assertEquals(out, { id: "focus-1", type: 0 });
});

Deno.test("get-focus: the focus id is encoded into its own segment", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute!({ focusId: "../habit", type: 1 }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/open/v1/focus/..%2Fhabit");
});

Deno.test("get-focus: type is required — it is part of the address, not a filter", () => {
  const type = action.params!.find((p) => p.key === "type")!;
  assert(type.required);
  assertEquals((type.options as Array<{ value: unknown }>).map((o) => o.value), [0, 1]);
});

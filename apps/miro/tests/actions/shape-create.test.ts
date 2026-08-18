import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/shape-create.ts";

Deno.test("shape-create: defaults to a rectangle and uses the stable endpoint", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "i1" } }], { display: {} });
  await action.execute!({ boardId: "b1", content: "Start" }, ctx);
  // /v2/, not /v2-experimental/.
  assertEquals(new URL(calls[0].url).pathname, "/v2/boards/b1/shapes");
  assertEquals(JSON.parse(calls[0].body!).data, { shape: "rectangle", content: "Start" });
});

Deno.test("shape-create: style passes through as parsed JSON", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }], { display: {} });
  await action.execute!({ boardId: "b1", shape: "circle", style: '{"fillColor":"#ffffff"}' }, ctx);
  assertEquals(JSON.parse(calls[0].body!).style, { fillColor: "#ffffff" });
});

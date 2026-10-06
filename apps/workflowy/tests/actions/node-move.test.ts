import { assertEquals } from "@std/assert";
import nodeMove from "../../actions/node-move.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

const OK = { status: "ok" };
Deno.test("node-move: POSTs parent and position to /move", async () => {
  const { ctx, calls } = mockCtx([{ body: OK }]);
  assertEquals(await nodeMove.execute({ id: "abc", parent_id: "today", position: "top" }, ctx), OK);
  assertEquals(pathOf(calls[0].url), "/api/v1/nodes/abc/move");
  assertEquals(JSON.parse(calls[0].body!), { parent_id: "today", position: "top" });
});

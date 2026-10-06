import { assertEquals } from "@std/assert";
import nodeMirrorCreate from "../../actions/node-mirror-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("node-mirror-create: maps item_id/origin_id", async () => {
  const { ctx, calls } = mockCtx([{ body: { item_id: "m1", origin_id: "o1" } }]);
  const out = await nodeMirrorCreate.execute({ id: "o1", parent_id: "p1" }, ctx);
  assertEquals(out, { id: "m1", origin_id: "o1" });
  assertEquals(pathOf(calls[0].url), "/api/v1/nodes/o1/mirror");
  assertEquals(JSON.parse(calls[0].body!), { parent_id: "p1" });
});

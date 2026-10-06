import { assertEquals } from "@std/assert";
import nodeMirrorDelete from "../../actions/node-mirror-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

const OK = { status: "ok" };
Deno.test("node-mirror-delete: DELETEs /nodes/:id/mirror", async () => {
  const { ctx, calls } = mockCtx([{ body: OK }]);
  assertEquals(await nodeMirrorDelete.execute({ id: "m1" }, ctx), OK);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/api/v1/nodes/m1/mirror");
});

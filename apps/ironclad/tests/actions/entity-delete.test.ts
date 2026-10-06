import { assertEquals } from "@std/assert";
import entityDelete from "../../actions/entity-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("entity-delete: DELETE /entities/{id}, 204 handled", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await entityDelete.execute({ entityId: "e1" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/public/api/v1/entities/e1");
  assertEquals(out, { deleted: true, entityId: "e1" });
});

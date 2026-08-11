import { assertEquals } from "@std/assert";
import action from "../../actions/entity-relationship-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("entity-relationship-delete: both the type and the target are path segments", async () => {
  const { ctx, calls } = mockCtx([{ status: 204, body: undefined }]);
  const out = await action.execute({ entityId: "e-1", type: "link", targetId: "t-1" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/v2/entities/e-1/relationships/link/t-1");
  assertEquals(out, { status: 204, deleted: true });
});

Deno.test("entity-relationship-delete: a non-204 is reported rather than claimed as deleted", async () => {
  const { ctx } = mockCtx([{ status: 200, body: {} }]);
  const out = await action.execute({ entityId: "e-1", type: "link", targetId: "t-1" }, ctx);
  assertEquals(out, { status: 200, deleted: false });
});

Deno.test("entity-relationship-delete: all three inputs are required", () => {
  for (const key of ["entityId", "type", "targetId"]) {
    assertEquals(action.params?.find((p) => p.key === key)?.required, true, key);
  }
});

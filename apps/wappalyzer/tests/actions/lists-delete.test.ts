import { assertEquals } from "@std/assert";
import listsDelete from "../../actions/lists-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("lists-delete: DELETEs /v2/lists/{id}, no trailing slash", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  const out = await listsDelete.execute({ id: "lst_abcdef" }, ctx) as { deleted: boolean };

  assertEquals(pathOf(calls[0].url), "/v2/lists/lst_abcdef");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(out.deleted, true);
});

/** Deleting an already-gone list is ordinary DELETE semantics — safe to retry. */
Deno.test("lists-delete: is marked idempotent", () => {
  assertEquals(listsDelete.idempotent, true);
});

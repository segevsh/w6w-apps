import { assertEquals } from "@std/assert";
import action from "../../actions/note-relationship-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

/**
 * The path segment is the RELATIONSHIP kind (`customer` / `link`), which is a
 * different vocabulary from the create body's `target.type` (`user`, `company`,
 * or the literal `link`).
 */
Deno.test("note-relationship-delete: the relationship kind is the path segment", async () => {
  const { ctx, calls } = mockCtx([{ status: 204, body: undefined }]);
  const out = await action.execute({ noteId: "n-1", targetType: "customer", targetId: "u-1" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/v2/notes/n-1/relationships/customer/u-1");
  assertEquals(out, { status: 204, deleted: true });
});

Deno.test("note-relationship-delete: the options are the two relationship kinds only", () => {
  const p = action.params?.find((p) => p.key === "targetType");
  assertEquals(
    (p?.options as Array<{ value: string }>).map((o) => o.value),
    ["customer", "link"],
  );
});

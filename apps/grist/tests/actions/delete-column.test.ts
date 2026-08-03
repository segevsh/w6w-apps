import { assert, assertEquals } from "@std/assert";
import { actionCtx } from "../_helpers.ts";
import deleteColumn from "../../actions/delete-column.ts";

Deno.test("delete-column: DELETEs the single-column path", async () => {
  const { ctx, calls } = actionCtx([{ status: 200, body: "" }]);
  const out = await deleteColumn.execute!({ docId: "d", tableId: "T", colId: "pet" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(new URL(calls[0].url).pathname, "/api/docs/d/tables/T/columns/pet");
  assertEquals(calls[0].body, null);
  assertEquals(out.deleted, "pet");
});

Deno.test("delete-column: warns in the hint about the leading $ formulas display", () => {
  const p = deleteColumn.params!.find((p) => p.key === "colId")!;
  assert(/\$/.test(p.hint ?? ""), "the $-prefix trap must be stated in the hint");
});

import { assert, assertEquals } from "@std/assert";
import { mockCtx, run } from "../_helpers.ts";
import deleteEntry from "../../actions/delete-entry.ts";

Deno.test("delete-entry: DELETEs the entry and summarises the empty 200", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  const out = await run<{ deleted: boolean; entry_id: string }>(
    deleteEntry,
    { list: "sales", entryId: "e1" },
    ctx,
  );
  assertEquals(calls[0].method, "DELETE");
  assertEquals(calls[0].url, "https://api.attio.com/v2/lists/sales/entries/e1");
  assertEquals(out, { deleted: true, entry_id: "e1" });
});

/** The distinction that stops someone reading "delete" as "delete the contact". */
Deno.test("delete-entry: says the record itself is untouched", () => {
  assert(/record itself is untouched/i.test(deleteEntry.description!));
});

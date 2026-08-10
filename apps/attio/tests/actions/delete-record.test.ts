import { assert, assertEquals } from "@std/assert";
import { mockCtx, run } from "../_helpers.ts";
import deleteRecord from "../../actions/delete-record.ts";

Deno.test("delete-record: DELETEs and summarises the empty 200", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  const out = await run<{ deleted: boolean; record_id: string }>(
    deleteRecord,
    { object: "people", recordId: "r1" },
    ctx,
  );
  assertEquals(calls[0].method, "DELETE");
  assertEquals(calls[0].url, "https://api.attio.com/v2/objects/people/records/r1");
  assertEquals(out, { deleted: true, record_id: "r1" });
});

Deno.test("delete-record: warns that this is not archiving", () => {
  const d = deleteRecord.description!;
  assert(/[Nn]ot reversible/.test(d), d);
  assert(/archiv/i.test(d), d);
});

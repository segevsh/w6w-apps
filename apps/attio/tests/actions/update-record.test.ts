import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import updateRecord from "../../actions/update-record.ts";

Deno.test("update-record: append sends PATCH", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: { id: { record_id: "r1" } } } }]);
  await updateRecord.execute({
    object: "companies",
    recordId: "r1",
    values: { categories: ["Aerospace"] },
    multiselect: "append",
  }, ctx);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(calls[0].url, "https://api.attio.com/v2/objects/companies/records/r1");
});

Deno.test("update-record: overwrite sends PUT", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: { id: { record_id: "r1" } } } }]);
  await updateRecord.execute({
    object: "companies",
    recordId: "r1",
    values: { categories: ["Aerospace"] },
    multiselect: "overwrite",
  }, ctx);
  assertEquals(calls[0].method, "PUT");
});

/**
 * The default has to be the verb that cannot delete anything. If this ever
 * flips, a workflow that omits the param starts silently removing values.
 */
Deno.test("update-record: an unset multiselect mode defaults to the non-destructive PATCH", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: {} } }]);
  await updateRecord.execute({ object: "people", recordId: "r1", values: { name: "A" } }, ctx);
  assertEquals(calls[0].method, "PATCH");
});

Deno.test("update-record: the description names both verbs' consequences", () => {
  const d = updateRecord.description!;
  assert(/append/i.test(d) && /overwrite/i.test(d), d);
  assert(/still returns 200/.test(d), d);
});

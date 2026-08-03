import { assert, assertEquals } from "@std/assert";
import { mockCtx, param } from "../_helpers.ts";
import listNotes from "../../actions/list-notes.ts";

Deno.test("list-notes: filters by parent object and record on the query string", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [] } }]);
  await listNotes.execute({
    parentObject: "people",
    parentRecordId: "r1",
    limit: 50,
    offset: 50,
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/notes");
  assertEquals(url.searchParams.get("parent_object"), "people");
  assertEquals(url.searchParams.get("parent_record_id"), "r1");
  assertEquals(url.searchParams.get("limit"), "50");
});

/**
 * The default here is 10 and the max 50, against 500 everywhere else in this
 * app. A workflow that assumes otherwise silently drops results.
 */
Deno.test("list-notes: carries the unusual 10/50 limit into the hint and the validation", () => {
  const limit = param(listNotes, "limit");
  assert(limit.hint!.includes("defaults to 10"), limit.hint);
  assertEquals(limit.validation?.max, 50);
  assert(/10 results/.test(listNotes.description!), listNotes.description);
});

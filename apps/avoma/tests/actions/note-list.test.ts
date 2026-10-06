import { assertEquals, assertRejects } from "@std/assert";
import noteList from "../../actions/note-list.ts";
import { mockCtx, pageBody, pathOf, queryOf } from "../_helpers.ts";

const WINDOW = { fromDate: "2026-10-01T00:00:00Z", toDate: "2026-10-02T00:00:00Z" };

Deno.test("note-list: GET /v1/notes/ maps meetingUuid to meeting_uuid and customCategory", async () => {
  const { ctx, calls } = mockCtx([{ body: pageBody([{ data: "# Notes" }]) }]);
  const out = await noteList.execute({
    ...WINDOW,
    meetingUuid: "m1",
    customCategory: "c1",
    outputFormat: "markdown",
    order: "-modified",
  }, ctx) as { results: unknown[] };
  assertEquals(pathOf(calls[0].url), "/v1/notes/");
  assertEquals(queryOf(calls[0].url), {
    from_date: WINDOW.fromDate,
    to_date: WINDOW.toDate,
    meeting_uuid: "m1",
    custom_category: "c1",
    output_format: "markdown",
    o: "-modified",
  });
  assertEquals(out.results.length, 1);
});

Deno.test("note-list: a 204 'no notes' answer becomes an empty page", async () => {
  const { ctx } = mockCtx([{ status: 204 }]);
  const out = await noteList.execute(WINDOW, ctx);
  assertEquals(out, { results: [], count: 0, next: null, previous: null });
});

Deno.test("note-list: the date window is required", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(async () => await noteList.execute({}, ctx), Error, "fromDate");
});

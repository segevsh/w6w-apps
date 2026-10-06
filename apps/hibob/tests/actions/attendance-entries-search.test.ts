import { assertEquals, assertRejects } from "@std/assert";
import search, { ENTRY_FIELDS } from "../../actions/attendance-entries-search.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

const base = { employeeId: "31", fromDate: "2026-10-01", toDate: "2026-10-31" };

Deno.test("attendance-entries-search: builds the employee + clockInDate range filters", async () => {
  const { ctx, calls } = mockCtx([{
    body: { items: [{ objectType: "attendanceEntry" }], response_metadata: { next_cursor: "abc" } },
  }]);
  const out = await search.execute({ ...base, limit: 50 }, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/attendance/entries/search");
  assertEquals(bodyOf(calls[0]), {
    fields: [...ENTRY_FIELDS],
    filters: [
      { fieldId: "/attendanceEntry/employeeId", operator: "equals", values: ["31"] },
      { fieldId: "/attendanceEntry/clockInDate", operator: "from", values: ["2026-10-01"] },
      { fieldId: "/attendanceEntry/clockInDate", operator: "to", values: ["2026-10-31"] },
    ],
    limit: 50,
  });
  assertEquals(out, { items: [{ objectType: "attendanceEntry" }], nextCursor: "abc" });
});

Deno.test("attendance-entries-search: forwards the cursor; no nextCursor on the last page", async () => {
  const { ctx, calls } = mockCtx([{ body: { items: [] } }]);
  const out = await search.execute(
    { ...base, cursor: "abc", fields: ["/attendanceEntry/id"] },
    ctx,
  );
  const body = bodyOf(calls[0]) as { cursor: string; fields: string[] };
  assertEquals(body.cursor, "abc");
  assertEquals(body.fields, ["/attendanceEntry/id"]);
  assertEquals(out, { items: [] });
});

Deno.test("attendance-entries-search: enforces the 33-day cap and known fields", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    () => Promise.resolve(search.execute({ ...base, toDate: "2026-11-05" }, ctx)),
    Error,
    "33-day",
  );
  await assertRejects(
    () => Promise.resolve(search.execute({ ...base, toDate: "2026-09-01" }, ctx)),
    Error,
    "before",
  );
  await assertRejects(
    () => Promise.resolve(search.execute({ ...base, fields: ["/attendanceEntry/nope"] }, ctx)),
    Error,
    "Unknown",
  );
  assertEquals(calls.length, 0);
});

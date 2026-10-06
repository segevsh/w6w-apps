import { assertEquals } from "@std/assert";
import { mockPeopleCtx } from "../_helpers.ts";
import action from "../../actions/attendance-entries-get.ts";

Deno.test("attendance-entries-get: passes identifiers and maps the bare response object", async () => {
  const { ctx, calls } = mockPeopleCtx([{
    body: {
      status: "Present",
      firstIn: "2023-03-03 09:00:00",
      lastOut: "2023-03-03 20:00:00",
      totalHrs: "10:00",
      allowedToCheckIn: true,
      entries: [{ checkIn: "03-Mar-2023 - 09:00 AM", checkOut: "03-Mar-2023 - 03:00 PM" }],
    },
  }]);
  const out = await action.execute({ date: "03-Mar-2023", emailId: "j@x.com" }, ctx) as Record<
    string,
    unknown
  >;
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/people/api/attendance/getAttendanceEntries");
  assertEquals(url.searchParams.get("date"), "03-Mar-2023");
  assertEquals(url.searchParams.get("emailId"), "j@x.com");
  assertEquals(out.status, "Present");
  assertEquals(out.totalHrs, "10:00");
  assertEquals((out.entries as unknown[]).length, 1);
});

Deno.test("attendance-entries-get: with no identifier it sends none (connected user)", async () => {
  const { ctx, calls } = mockPeopleCtx([{ body: { status: "Absent", entries: [] } }]);
  const out = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(new URL(calls[0].url).search, "");
  assertEquals(out.firstIn, null);
  assertEquals(out.entries, []);
});

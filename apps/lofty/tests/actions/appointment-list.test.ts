import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/appointment-list.ts";

Deno.test("appointment-list: lists a lead's appointments unfiltered", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: [
      { id: 1, descr: "Showing", deadline: 1747272300000, allDay: false, deleteFlag: false },
      { id: 2, descr: "Old", deadline: 1747000000000, allDay: false, deleteFlag: true },
    ],
  }]);
  const result = await action.execute!({ leadId: 555 }, ctx) as Array<{ deleteFlag: boolean }>;

  assertEquals(new URL(calls[0].url).pathname, "/v1.0/appts");
  assertEquals(new URL(calls[0].url).searchParams.get("leadId"), "555");
  // Deleted and finished appointments are included; filtering is the caller's job.
  assertEquals(result.length, 2);
  assertEquals(result.filter((a) => a.deleteFlag).length, 1);
});

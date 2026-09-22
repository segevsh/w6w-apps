import { assert, assertEquals } from "@std/assert";
import jobActivityEntriesList from "../../actions/job-activity-entries-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("job-activity-entries-list: reads the nested route", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: 9, activityEntryType: { name: "Comment" } }] }]);
  const result = await jobActivityEntriesList.execute({ jobId: 1010 }, ctx) as {
    activityEntries: unknown[];
  };

  assertEquals(pathOf(calls[0].url), "/v2/jobs/1010/activity_entries");
  assertEquals(result.activityEntries.length, 1);
});

Deno.test("job-activity-entries-list: the type filter is optional", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }, { body: [] }]);
  await jobActivityEntriesList.execute({ jobId: 1010 }, ctx);
  assert(!("activity_entry_type_id" in queryOf(calls[0].url)));

  await jobActivityEntriesList.execute({ jobId: 1010, activityEntryTypeId: 2 }, ctx);
  assertEquals(queryOf(calls[1].url).activity_entry_type_id, "2");
});

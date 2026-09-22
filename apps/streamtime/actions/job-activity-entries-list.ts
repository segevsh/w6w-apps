import type { ActionDefinition } from "@w6w/types";
import { encodeId, StreamtimeClient } from "../lib/client.ts";
import { idParam, optionalIdParam } from "../lib/params.ts";

/**
 * `GET /jobs/{job_id}/activity_entries` — the job's activity feed.
 *
 * "Lists **active** activity entries" per the vendor's own description, and the
 * optional `activity_entry_type_id` filter takes a nullable integer in the
 * schema. An entry is a comment or a system event: `activityEntryType` and
 * `activityEntryParentType` are `{ name }` objects, and `metaData` is a JSON
 * string the API hands back unparsed.
 */
interface Input {
  jobId: number;
  activityEntryTypeId?: number;
}

const jobActivityEntriesList: ActionDefinition<Input> = {
  key: "job-activity-entries-list",
  type: "search",
  resource: "job",
  title: "List Job Activity Entries",
  description:
    "List the active activity entries (comments and system events) on a job, optionally filtered " +
    "by activity entry type.",
  params: [
    idParam("jobId", "Job ID"),
    optionalIdParam("activityEntryTypeId", "Activity Entry Type ID", "Filter by type."),
  ],
  output: [{ key: "activityEntries", type: "array", label: "Activity entries" }],

  async execute(input, ctx) {
    const activityEntries = await new StreamtimeClient(ctx).request<unknown[]>(
      `/jobs/${encodeId(input.jobId)}/activity_entries`,
      { query: { activity_entry_type_id: input.activityEntryTypeId } },
    );
    return { activityEntries: activityEntries ?? [] };
  },
};

export default jobActivityEntriesList;

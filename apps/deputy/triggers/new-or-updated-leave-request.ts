import { queryTrigger } from "../lib/triggers.ts";
import { leaveOutput, leaveSample } from "../lib/leave.ts";

/** Same read as `new-leave-request`, newest-modified first; an edit (for example an approval)
 * changes `Modified`, which makes it a new event. */
export default queryTrigger({
  key: "new-or-updated-leave-request",
  title: "New or Updated Leave Request",
  description: "The run gets each leave request that was created or edited since the last check.",
  object: "Leave",
  sort: { Modified: "desc" },
  idOf: (item) => {
    const l = item as { Id?: unknown; Modified?: unknown };
    return `${l.Id ?? ""}:${l.Modified ?? ""}`;
  },
  output: leaveOutput,
  sample: leaveSample,
});

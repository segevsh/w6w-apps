import { pollFromListAction } from "../../_shared/poll/mod.ts";
import timesheetSearch from "../actions/timesheet-search.ts";
import { timesheetItems, timesheetOutput, timesheetSample } from "../lib/timesheet.ts";

export default pollFromListAction({
  key: "new-or-updated-timesheet",
  title: "New or Updated Timesheet",
  description: "The run gets each timesheet that was created or edited since the last check.",
  action: timesheetSearch,
  input: () => ({ sort: { Modified: "desc" }, max: 100, cursor: 0 }),
  items: timesheetItems,
  idOf: (item) => {
    const t = item as { Id?: unknown; Modified?: unknown };
    return `${t.Id ?? ""}:${t.Modified ?? ""}`;
  },
  output: timesheetOutput,
  sample: timesheetSample,
  maxPages: 1,
});

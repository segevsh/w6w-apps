import { pollFromListAction } from "../../_shared/poll/mod.ts";
import timesheetSearch from "../actions/timesheet-search.ts";
import { timesheetItems, timesheetOutput, timesheetSample } from "../lib/timesheet.ts";

export default pollFromListAction({
  key: "new-timesheet",
  title: "New Timesheet",
  description: "The run gets each newly created timesheet.",
  action: timesheetSearch,
  input: () => ({ sort: { Id: "desc" }, max: 100, cursor: 0 }),
  items: timesheetItems,
  idOf: (item) => String((item as { Id?: unknown }).Id ?? ""),
  output: timesheetOutput,
  sample: timesheetSample,
  maxPages: 1,
});

import { queryTrigger } from "../lib/triggers.ts";
import { leaveOutput, leaveSample } from "../lib/leave.ts";

/** `GET /resource/Leave` (the `leave-list` action) returns the first 500 records in id order with
 * no way to ask for the newest, so this reads the same resource through its documented QUERY
 * endpoint, `sort: { Id: "desc" }`. https://developer.deputy.com/docs */
export default queryTrigger({
  key: "new-leave-request",
  title: "New Leave Request",
  description: "The run gets each newly created leave request.",
  object: "Leave",
  sort: { Id: "desc" },
  idOf: (item) => String((item as { Id?: unknown }).Id ?? ""),
  output: leaveOutput,
  sample: leaveSample,
});

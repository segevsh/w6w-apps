import type { ActionDefinition } from "@w6w/types";
import instructorsList from "../actions/instructors-list.ts";
import { snapshotTrigger } from "../lib/triggers.ts";

export default snapshotTrigger({
  key: "new-instructor",
  title: "New Instructor",
  description:
    "The run gets each instructor newly added to the business, read as a whole through instructors-list.",
  action: instructorsList as unknown as ActionDefinition,
  sample: { id: 34, first_name: "Sam", last_name: "Rivera" },
});

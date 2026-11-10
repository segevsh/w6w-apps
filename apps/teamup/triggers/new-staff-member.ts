import type { ActionDefinition } from "@w6w/types";
import staffList from "../actions/staff-list.ts";
import { snapshotTrigger } from "../lib/triggers.ts";

export default snapshotTrigger({
  key: "new-staff-member",
  title: "New Staff Member",
  description:
    "The run gets each staff member newly given an account on the business, read as a whole through staff-list.",
  action: staffList as unknown as ActionDefinition,
  sample: { id: 56, first_name: "Alex", last_name: "Kim" },
});

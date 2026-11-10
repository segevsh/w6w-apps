import type { ActionDefinition } from "@w6w/types";
import membershipsList from "../actions/memberships-list.ts";
import { snapshotTrigger } from "../lib/triggers.ts";

export default snapshotTrigger({
  key: "new-membership-plan",
  title: "New Membership Plan",
  description:
    "The run gets each sellable membership plan newly created, read as a whole through memberships-list.",
  action: membershipsList as unknown as ActionDefinition,
  sample: { id: 90, name: "10-class pack" },
});

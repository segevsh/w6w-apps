import type { ActionDefinition } from "@w6w/types";
import offeringTypesList from "../actions/offering-types-list.ts";
import { snapshotTrigger } from "../lib/triggers.ts";

export default snapshotTrigger({
  key: "new-offering-type",
  title: "New Offering Type",
  description:
    "The run gets each class type newly created, read as a whole through offering-types-list.",
  action: offeringTypesList as unknown as ActionDefinition,
  sample: { id: 21, name: "Yoga" },
});

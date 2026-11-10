import type { ActionDefinition } from "@w6w/types";
import venuesList from "../actions/venues-list.ts";
import { snapshotTrigger } from "../lib/triggers.ts";

export default snapshotTrigger({
  key: "new-venue",
  title: "New Venue",
  description:
    "The run gets each venue newly added to the business, read as a whole through venues-list (the collection is the business's own handful of locations).",
  action: venuesList as unknown as ActionDefinition,
  sample: { id: 12, name: "Main Studio" },
});

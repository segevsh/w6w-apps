import { feedTrigger } from "../lib/triggers.ts";
import personFeed from "../actions/person-feed.ts";

export default feedTrigger({
  key: "new-or-updated-person",
  title: "New or Updated Person",
  description:
    "The run gets each person that is created or changed in Cloze, from the change feed.",
  action: personFeed,
  output: [
    { key: "syncKey", type: "string", label: "Sync key" },
    { key: "name", type: "string", label: "Name" },
    { key: "stage", type: "string", label: "Stage" },
    { key: "segment", type: "string", label: "Segment" },
  ],
  sample: { syncKey: "person-1a2b", name: "Ada Lovelace", stage: "lead", segment: "customer" },
});

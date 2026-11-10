import { feedTrigger } from "../lib/triggers.ts";
import projectFeed from "../actions/project-feed.ts";

export default feedTrigger({
  key: "new-or-updated-project",
  title: "New or Updated Project",
  description:
    "The run gets each project that is created or changed in Cloze, from the change feed.",
  action: projectFeed,
  output: [
    { key: "syncKey", type: "string", label: "Sync key" },
    { key: "name", type: "string", label: "Name" },
    { key: "stage", type: "string", label: "Stage" },
    { key: "segment", type: "string", label: "Segment" },
  ],
  sample: { syncKey: "project-5e6f", name: "Renewal 2027", stage: "lead", segment: "customer" },
});

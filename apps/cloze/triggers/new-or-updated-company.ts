import { feedTrigger } from "../lib/triggers.ts";
import companyFeed from "../actions/company-feed.ts";

export default feedTrigger({
  key: "new-or-updated-company",
  title: "New or Updated Company",
  description:
    "The run gets each company that is created or changed in Cloze, from the change feed.",
  action: companyFeed,
  output: [
    { key: "syncKey", type: "string", label: "Sync key" },
    { key: "name", type: "string", label: "Name" },
    { key: "stage", type: "string", label: "Stage" },
    { key: "segment", type: "string", label: "Segment" },
  ],
  sample: {
    syncKey: "company-3c4d",
    name: "Analytical Engines Ltd",
    stage: "lead",
    segment: "customer",
  },
});

import campaignList from "../actions/campaign-list.ts";
import { newRecordTrigger } from "../lib/triggers.ts";

export default newRecordTrigger({
  key: "new-campaign",
  title: "New Campaign",
  description: "The run gets each newly created campaign.",
  action: campaignList,
  output: [
    { key: "id", type: "number", label: "Campaign ID" },
    { key: "name", type: "string", label: "Name" },
  ],
  sample: { id: 1001, name: "Annual fund" },
});

import campaignSequenceList from "../actions/campaign-sequence-list.ts";
import { snapshotTrigger } from "../lib/triggers.ts";

/**
 * The run gets each sequence newly added to the chosen campaign (`GET
 * /rest/v2/campaigns/{campaign_id}/sequences`). A campaign holds a handful of sequences and the
 * endpoint takes no paging, so each check reads them whole and diffs by id. Brief 9.1 (c).
 */
export default snapshotTrigger({
  key: "new-campaign-sequence",
  title: "New Campaign Sequence",
  description: "The run gets each sequence newly added to the chosen campaign.",
  action: campaignSequenceList,
  list: "sequences",
  params: [{
    key: "campaignId",
    label: "Campaign ID",
    type: "string",
    required: true,
    default: "",
  }],
  extra: (p) => ({ campaignId: p.campaignId }),
  output: [
    { key: "id", type: "string", label: "Sequence ID" },
    { key: "name", type: "string", label: "Name" },
  ],
  sample: { id: "5", name: "Welcome Series" },
});

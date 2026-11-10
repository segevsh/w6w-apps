import campaignList from "../actions/campaign-list.ts";
import { feedTrigger } from "../lib/triggers.ts";

/** The run gets each new Keap campaign, newest first (`GET /rest/v2/campaigns`, `order_by=datecreated desc`). Brief 9.1 (a). */
export default feedTrigger({
  key: "new-campaign",
  title: "New Campaign",
  description:
    "The run gets each new Keap campaign, newest first (`GET /rest/v2/campaigns`, `order_by=datecreated desc`).",
  action: campaignList,
  list: "campaigns",
  orderBy: "datecreated desc",
  output: [{ key: "id", type: "string", label: "ID" }, {
    key: "name",
    type: "string",
    label: "Name",
  }, { key: "date_created", type: "string", label: "Created at" }],
  sample: { id: "1", name: "Spring promo", date_created: "2026-11-10T12:00:00.000Z" },
});

import { pollFromListAction } from "../../_shared/poll/mod.ts";
import listCampaigns from "../actions/list-campaigns.ts";

/**
 * `list-campaigns`: `GET /campaigns?orders[sdate]=DESC&limit=20` — ActiveCampaign documents `orders[sdate]`
 * (https://developers.activecampaign.com/reference/list-all-campaigns, verified 2026-11-10), so page 1 is the newest sent campaigns (autoresponder and automation campaigns included, which the sent webhook skips).
 */
export default pollFromListAction({
  key: "new-sent-campaign",
  title: "New Sent Campaign",
  description:
    "The run gets each email campaign newly sent from ActiveCampaign, including automation and autoresponder campaigns.",
  action: listCampaigns,
  input: () => ({ orderBy: "sdate", orderDirection: "DESC", limit: 20 }),
  items: (r) => ((r as { campaigns?: unknown[] }).campaigns) ?? [],
  idOf: (item) => String((item as { id: string | number }).id),
  output: [
    { key: "id", type: "string", label: "Campaign ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "type", type: "string", label: "Type" },
    { key: "status", type: "string", label: "Status" },
    { key: "sdate", type: "string", label: "Send Date" },
  ],
  sample: {
    id: "12",
    name: "Spring sale",
    type: "single",
    status: "5",
    sdate: "2026-11-10T10:00:00-06:00",
  },
});

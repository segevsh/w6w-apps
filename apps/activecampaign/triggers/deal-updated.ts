import { eventTrigger } from "../lib/triggers.ts";

/** ActiveCampaign webhook event `deal_update` (https://developers.activecampaign.com/page/webhooks, verified 2026-11-10). */
const dealUpdated = eventTrigger({
  key: "deal-updated",
  title: "Deal Updated",
  description:
    "Fires when a deal is updated. The run gets the deal (id, title, value, stage, pipeline), the fields that changed and the full payload.",
  event: "deal_update",
  sample: {
    type: "deal_update",
    dateTime: "2026-11-10T10:00:00-06:00",
    initiatedFrom: "admin",
    initiatedBy: "admin",
    contact: null,
    deal: {
      id: "7",
      title: "Annual contract",
      value: "5000",
      currency: "usd",
      stageid: "2",
      pipelineid: "1",
    },
    campaign: null,
    data: {
      type: "deal_update",
      deal: {
        id: "7",
        title: "Annual contract",
        value: "5000",
        currency: "usd",
        stageid: "2",
        pipelineid: "1",
      },
    },
  },
});

export default dealUpdated;

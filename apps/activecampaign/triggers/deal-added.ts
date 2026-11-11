import { eventTrigger } from "../lib/triggers.ts";

/** ActiveCampaign webhook event `deal_add` (https://developers.activecampaign.com/page/webhooks, verified 2026-11-10). */
const dealAdded = eventTrigger({
  key: "deal-added",
  title: "Deal Added",
  description:
    "Fires when a deal is created. The run gets the deal (id, title, value, stage, pipeline), its primary contact and the full payload.",
  event: "deal_add",
  sample: {
    type: "deal_add",
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
      type: "deal_add",
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

export default dealAdded;

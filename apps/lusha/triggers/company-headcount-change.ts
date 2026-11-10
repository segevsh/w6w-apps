import { webhookTrigger } from "../lib/triggers.ts";

/** A watched company's headcount rises or falls over 1, 3, 6 or 12 months. */
const companyHeadcountChange = webhookTrigger({
  key: "company-headcount-change",
  title: "Company Headcount Change",
  description:
    "Fires when Lusha detects that a company you watch grew or shrank its headcount over 1, 3, 6 or 12 months (signals headcountIncrease1m to headcountDecrease12m). The run gets the signal type, the company id, the subscription, the signal time, the credits charged and the signal data.",
  fixed: {
    entityType: "company",
    signalTypes: [
      "headcountIncrease1m",
      "headcountIncrease3m",
      "headcountIncrease6m",
      "headcountIncrease12m",
      "headcountDecrease1m",
      "headcountDecrease3m",
      "headcountDecrease6m",
      "headcountDecrease12m",
    ],
  },
  sample: {
    id: "f3b87e05-0402-4f3e-8e26-6a38fd0ad62c",
    type: "headcountIncrease3m",
    entityType: "company",
    entityId: "33222678",
    subscriptionId: "507f1f77bcf86cd799439011",
    timestamp: "2026-01-14T16:16:35.841Z",
    creditsCharged: 1,
    data: {
      companyId: "33222678",
      companyName: "Lusha",
      domain: "lusha.com",
    },
  },
});

export default companyHeadcountChange;

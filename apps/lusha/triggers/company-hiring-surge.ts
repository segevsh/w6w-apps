import { webhookTrigger } from "../lib/triggers.ts";

/** A watched company's hiring surges (signals `surgeInHiring`, `surgeInHiringByDepartment`, `surgeInHiringByLocation`). */
const companyHiringSurge = webhookTrigger({
  key: "company-hiring-surge",
  title: "Company Hiring Surge",
  description:
    "Fires when Lusha detects a hiring surge at a company you watch: overall, in one department or in one location (signals surgeInHiring, surgeInHiringByDepartment, surgeInHiringByLocation). The run gets the signal type, the company id, the subscription, the signal time, the credits charged and the signal data.",
  fixed: {
    entityType: "company",
    signalTypes: ["surgeInHiring", "surgeInHiringByDepartment", "surgeInHiringByLocation"],
  },
  sample: {
    id: "f3b87e05-0402-4f3e-8e26-6a38fd0ad62c",
    type: "surgeInHiring",
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

export default companyHiringSurge;

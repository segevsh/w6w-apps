import { webhookTrigger } from "../lib/triggers.ts";

/** A watched contact is promoted within the same company (signal `promotion`). */
const contactPromotion = webhookTrigger({
  key: "contact-promotion",
  title: "Contact Promoted",
  description:
    "Fires when Lusha detects that a contact you watch was promoted within the same company (signal promotion). The run gets the signal, the contact id, the subscription, the signal time, the credits charged and the signal data (new title, company, previous company).",
  fixed: { entityType: "contact", signalTypes: ["promotion"] },
  sample: {
    id: "f3b87e05-0402-4f3e-8e26-6a38fd0ad62c",
    type: "promotion",
    entityType: "contact",
    entityId: "4158887495",
    subscriptionId: "507f1f77bcf86cd799439011",
    timestamp: "2026-01-14T16:16:35.841Z",
    creditsCharged: 1,
    data: {
      personId: 4158887495,
      currentCompanyName: "OMG Hospitality Group LLC",
      currentTitle: "Bartender",
      previousCompanyName: "First Watch Restaurants",
      signalDate: "2025-07-01",
    },
  },
});

export default contactPromotion;

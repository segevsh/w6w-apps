import { type HubSpotWebhookSpec, hubspotWebhookTrigger } from "./triggers.ts";

/**
 * The named HubSpot webhook triggers: created, updated (property change) and deleted for each
 * record type the app has actions for. HubSpot event types are
 * https://developers.hubspot.com/docs/api-reference/legacy/webhooks/guide (verified 2026-11-10);
 * the sample notifications follow the payload example there.
 */
export const WEBHOOK_EVENTS: HubSpotWebhookSpec[] = [
  {
    key: "contact-created",
    title: "Contact Created",
    description:
      "Fires when a contact is created in the HubSpot account. The run gets the contact id, the account id and where the change came from; fetch the record with the Get Contact action.",
    types: ["contact.creation"],
    sampleEvent: {
      objectId: 1246978,
      changeSource: "IMPORT",
      eventId: 3816279480,
      subscriptionId: 22,
      portalId: 33,
      appId: 1160452,
      occurredAt: 1462216307945,
      eventType: "contact.creation",
      attemptNumber: 0,
    },
  },
  {
    key: "contact-updated",
    title: "Contact Updated",
    description:
      "Fires when a property of a contact changes. HubSpot sends one notification per changed property; the run gets the property name and its new value. Narrow it with the Properties param.",
    types: ["contact.propertyChange"],
    propertyFilter: true,
    sampleEvent: {
      objectId: 1246965,
      propertyName: "lifecyclestage",
      propertyValue: "subscriber",
      changeSource: "CRM_UI",
      eventId: 3816279340,
      subscriptionId: 25,
      portalId: 33,
      appId: 1160452,
      occurredAt: 1462216307945,
      eventType: "contact.propertyChange",
      attemptNumber: 0,
    },
  },
  {
    key: "contact-deleted",
    title: "Contact Deleted",
    description:
      "Fires when a contact is deleted in the HubSpot account. The run gets the id of the deleted contact.",
    types: ["contact.deletion"],
    sampleEvent: {
      objectId: 1246965,
      changeSource: "CRM_UI",
      eventId: 3816279341,
      subscriptionId: 26,
      portalId: 33,
      appId: 1160452,
      occurredAt: 1462216307945,
      eventType: "contact.deletion",
      attemptNumber: 0,
    },
  },
  {
    key: "company-created",
    title: "Company Created",
    description:
      "Fires when a company is created in the HubSpot account. The run gets the company id, the account id and where the change came from; fetch the record with the Get Company action.",
    types: ["company.creation"],
    sampleEvent: {
      objectId: 1246978,
      changeSource: "IMPORT",
      eventId: 3816279480,
      subscriptionId: 22,
      portalId: 33,
      appId: 1160452,
      occurredAt: 1462216307945,
      eventType: "company.creation",
      attemptNumber: 0,
    },
  },
  {
    key: "company-updated",
    title: "Company Updated",
    description:
      "Fires when a property of a company changes. HubSpot sends one notification per changed property; the run gets the property name and its new value. Narrow it with the Properties param.",
    types: ["company.propertyChange"],
    propertyFilter: true,
    sampleEvent: {
      objectId: 1246965,
      propertyName: "name",
      propertyValue: "Acme",
      changeSource: "CRM_UI",
      eventId: 3816279340,
      subscriptionId: 25,
      portalId: 33,
      appId: 1160452,
      occurredAt: 1462216307945,
      eventType: "company.propertyChange",
      attemptNumber: 0,
    },
  },
  {
    key: "company-deleted",
    title: "Company Deleted",
    description:
      "Fires when a company is deleted in the HubSpot account. The run gets the id of the deleted company.",
    types: ["company.deletion"],
    sampleEvent: {
      objectId: 1246965,
      changeSource: "CRM_UI",
      eventId: 3816279341,
      subscriptionId: 26,
      portalId: 33,
      appId: 1160452,
      occurredAt: 1462216307945,
      eventType: "company.deletion",
      attemptNumber: 0,
    },
  },
  {
    key: "deal-created",
    title: "Deal Created",
    description:
      "Fires when a deal is created in the HubSpot account. The run gets the deal id, the account id and where the change came from; fetch the record with the Get Deal action.",
    types: ["deal.creation"],
    sampleEvent: {
      objectId: 1246978,
      changeSource: "IMPORT",
      eventId: 3816279480,
      subscriptionId: 22,
      portalId: 33,
      appId: 1160452,
      occurredAt: 1462216307945,
      eventType: "deal.creation",
      attemptNumber: 0,
    },
  },
  {
    key: "deal-updated",
    title: "Deal Updated",
    description:
      "Fires when a property of a deal changes. HubSpot sends one notification per changed property; the run gets the property name and its new value. Narrow it with the Properties param.",
    types: ["deal.propertyChange"],
    propertyFilter: true,
    sampleEvent: {
      objectId: 1246965,
      propertyName: "dealstage",
      propertyValue: "closedwon",
      changeSource: "CRM_UI",
      eventId: 3816279340,
      subscriptionId: 25,
      portalId: 33,
      appId: 1160452,
      occurredAt: 1462216307945,
      eventType: "deal.propertyChange",
      attemptNumber: 0,
    },
  },
  {
    key: "deal-deleted",
    title: "Deal Deleted",
    description:
      "Fires when a deal is deleted in the HubSpot account. The run gets the id of the deleted deal.",
    types: ["deal.deletion"],
    sampleEvent: {
      objectId: 1246965,
      changeSource: "CRM_UI",
      eventId: 3816279341,
      subscriptionId: 26,
      portalId: 33,
      appId: 1160452,
      occurredAt: 1462216307945,
      eventType: "deal.deletion",
      attemptNumber: 0,
    },
  },
  {
    key: "ticket-created",
    title: "Ticket Created",
    description:
      "Fires when a ticket is created in the HubSpot account. The run gets the ticket id, the account id and where the change came from; fetch the record with the Get Ticket action.",
    types: ["ticket.creation"],
    sampleEvent: {
      objectId: 1246978,
      changeSource: "IMPORT",
      eventId: 3816279480,
      subscriptionId: 22,
      portalId: 33,
      appId: 1160452,
      occurredAt: 1462216307945,
      eventType: "ticket.creation",
      attemptNumber: 0,
    },
  },
  {
    key: "ticket-updated",
    title: "Ticket Updated",
    description:
      "Fires when a property of a ticket changes. HubSpot sends one notification per changed property; the run gets the property name and its new value. Narrow it with the Properties param.",
    types: ["ticket.propertyChange"],
    propertyFilter: true,
    sampleEvent: {
      objectId: 1246965,
      propertyName: "hs_pipeline_stage",
      propertyValue: "2",
      changeSource: "CRM_UI",
      eventId: 3816279340,
      subscriptionId: 25,
      portalId: 33,
      appId: 1160452,
      occurredAt: 1462216307945,
      eventType: "ticket.propertyChange",
      attemptNumber: 0,
    },
  },
  {
    key: "ticket-deleted",
    title: "Ticket Deleted",
    description:
      "Fires when a ticket is deleted in the HubSpot account. The run gets the id of the deleted ticket.",
    types: ["ticket.deletion"],
    sampleEvent: {
      objectId: 1246965,
      changeSource: "CRM_UI",
      eventId: 3816279341,
      subscriptionId: 26,
      portalId: 33,
      appId: 1160452,
      occurredAt: 1462216307945,
      eventType: "ticket.deletion",
      attemptNumber: 0,
    },
  },
];

export function webhookSpec({ key }: { key: string }): HubSpotWebhookSpec {
  const spec = WEBHOOK_EVENTS.find((e) => e.key === key);
  if (!spec) throw new Error(`No named HubSpot webhook trigger ${key}.`);
  return spec;
}

export const webhookTriggerFor = (ref: { key: string }) => hubspotWebhookTrigger(webhookSpec(ref));

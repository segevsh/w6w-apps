import { webhookTrigger } from "../lib/triggers.ts";

/** A user registers for a webinar (event `registrant.added`). */
const registrantAdded = webhookTrigger({
  key: "registrant-added",
  title: "New Registrant",
  description:
    "Fires when someone registers for one of the organizer's GoTo Webinar webinars (event registrant.added). The run gets the webinar key and title, the registrant's key, name and email, the registration status and join URL, and the full event data.",
  eventName: "registrant.added",
  sample: {
    eventName: "registrant.added",
    eventKey: "74d38461-9db8-4e41-8f59-d99f00b82411",
    webinarKey: "5620084814059709442",
    webinarTitle: "New Webinar",
    registrantKey: "8325357307900339981",
    sessionKey: null,
    email: "ada@example.com",
    firstName: "Ada",
    lastName: "Lovelace",
    timestamp: "2026-11-10T09:15:00.000Z",
    data: {
      eventName: "registrant.added",
      eventVersion: "1.0.0",
      product: "g2w",
      eventKey: "74d38461-9db8-4e41-8f59-d99f00b82411",
      firstName: "Ada",
      lastName: "Lovelace",
      email: "ada@example.com",
      status: "Approved",
      webinarKey: "5620084814059709442",
      webinarTitle: "New Webinar",
      registrantKey: "8325357307900339981",
      timestamp: "2026-11-10T09:15:00.000Z",
    },
  },
});

export default registrantAdded;

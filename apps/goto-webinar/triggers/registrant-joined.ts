import { webhookTrigger } from "../lib/triggers.ts";

/** A registrant joins a webinar session (event `registrant.joined`). */
const registrantJoined = webhookTrigger({
  key: "registrant-joined",
  title: "Registrant Joined",
  description:
    "Fires when a registrant joins a GoTo Webinar session (event registrant.joined). The run gets the webinar and session keys, the registrant's key, name and email, and the full event data.",
  eventName: "registrant.joined",
  sample: {
    eventName: "registrant.joined",
    eventKey: "74d38461-9db8-4e41-8f59-d99f00b82412",
    webinarKey: "5620084814059709442",
    webinarTitle: "New Webinar",
    registrantKey: "8325357307900339981",
    sessionKey: "15887209",
    email: "ada@example.com",
    firstName: "Ada",
    lastName: "Lovelace",
    timestamp: "2026-11-10T10:00:04.517Z",
    data: {
      eventName: "registrant.joined",
      eventVersion: "1.0.0",
      product: "g2w",
      eventKey: "74d38461-9db8-4e41-8f59-d99f00b82412",
      sessionKey: "15887209",
      webinarKey: "5620084814059709442",
      firstName: "Ada",
      lastName: "Lovelace",
      email: "ada@example.com",
      registrantKey: "8325357307900339981",
      timestamp: "2026-11-10T10:00:04.517Z",
    },
  },
});

export default registrantJoined;

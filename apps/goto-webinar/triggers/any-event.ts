import { anyEventTrigger } from "../lib/triggers.ts";

/** Any of GoTo Webinar's five webhook events; the run's `eventName` says which. */
const anyEvent = anyEventTrigger({
  key: "any-event",
  title: "Any Event",
  description:
    "Fires on the GoTo Webinar events you pick (registrant.added, registrant.joined, webinar.created, webinar.changed, survey.submitted), or all of them when the list is empty. The run gets the event name and key, the webinar, registrant and session keys, the registrant's name and email, and the full event data.",
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
      webinarKey: "5620084814059709442",
      webinarTitle: "New Webinar",
      registrantKey: "8325357307900339981",
      email: "ada@example.com",
    },
  },
});

export default anyEvent;

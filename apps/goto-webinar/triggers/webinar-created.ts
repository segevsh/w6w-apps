import { webhookTrigger } from "../lib/triggers.ts";

/** A webinar is created (event `webinar.created`). */
const webinarCreated = webhookTrigger({
  key: "webinar-created",
  title: "Webinar Created",
  description:
    "Fires when the organizer creates a GoTo Webinar webinar (event webinar.created). The run gets the webinar key and title and the full event data with the description, schedule and time zone.",
  eventName: "webinar.created",
  sample: {
    eventName: "webinar.created",
    eventKey: "74d38461-9db8-4e41-8f59-d99f00b82413",
    webinarKey: "5620084814059709442",
    webinarTitle: "New Webinar",
    registrantKey: null,
    sessionKey: null,
    email: null,
    firstName: null,
    lastName: null,
    timestamp: null,
    data: {
      eventName: "webinar.created",
      eventVersion: "1.0.0",
      product: "g2w",
      eventKey: "74d38461-9db8-4e41-8f59-d99f00b82413",
      webinarKey: "5620084814059709442",
      webinarTitle: "New Webinar",
      status: "NEW",
      startTime: "2026-11-20T15:00:00Z",
      endTime: "2026-11-20T16:00:00Z",
      timeZone: "Europe/London",
    },
  },
});

export default webinarCreated;

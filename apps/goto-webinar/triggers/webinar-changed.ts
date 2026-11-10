import { webhookTrigger } from "../lib/triggers.ts";

/** A webinar is updated or deleted (event `webinar.changed`). */
const webinarChanged = webhookTrigger({
  key: "webinar-changed",
  title: "Webinar Changed",
  description:
    "Fires when the organizer updates or deletes a GoTo Webinar webinar (event webinar.changed). The run gets the webinar key and title and the full event data, whose status is UPDATED or DELETED.",
  eventName: "webinar.changed",
  sample: {
    eventName: "webinar.changed",
    eventKey: "74d38461-9db8-4e41-8f59-d99f00b82414",
    webinarKey: "5620084814059709442",
    webinarTitle: "New Webinar",
    registrantKey: null,
    sessionKey: null,
    email: null,
    firstName: null,
    lastName: null,
    timestamp: null,
    data: {
      eventName: "webinar.changed",
      eventVersion: "1.0.0",
      product: "g2w",
      eventKey: "74d38461-9db8-4e41-8f59-d99f00b82414",
      webinarKey: "5620084814059709442",
      webinarTitle: "New Webinar",
      status: "UPDATED",
    },
  },
});

export default webinarChanged;

import { webhookTrigger } from "../lib/triggers.ts";

/** An attendee submits a post-session survey (event `survey.submitted`). */
const surveySubmitted = webhookTrigger({
  key: "survey-submitted",
  title: "Survey Submitted",
  description:
    "Fires when an attendee submits a post-session survey (event survey.submitted). The run gets the webinar, session and registrant keys and the full event data with the survey name and responses.",
  eventName: "survey.submitted",
  sample: {
    eventName: "survey.submitted",
    eventKey: "74d38461-9db8-4e41-8f59-d99f00b82415",
    webinarKey: "5620084814059709442",
    webinarTitle: "New Webinar",
    registrantKey: "8325357307900339981",
    sessionKey: "15887209",
    email: null,
    firstName: null,
    lastName: null,
    timestamp: "2026-11-10T11:00:00.000Z",
    data: {
      eventName: "survey.submitted",
      eventVersion: "1.0.0",
      product: "g2w",
      eventKey: "74d38461-9db8-4e41-8f59-d99f00b82415",
      timestamp: "2026-11-10T11:00:00.000Z",
      webinarKey: "5620084814059709442",
      sessionKey: "15887209",
      registrantKey: "8325357307900339981",
      surveyName: "Post-session survey",
    },
  },
});

export default surveySubmitted;

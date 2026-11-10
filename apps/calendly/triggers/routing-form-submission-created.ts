import { resourceTrigger } from "../lib/triggers.ts";

/** Someone submits a routing form (whether or not they book). */
const routingFormSubmissionCreated = resourceTrigger({
  key: "routing-form-submission-created",
  title: "Routing Form Submitted",
  description:
    "Fires when someone submits a Calendly routing form, whether or not they go on to book. The run gets the form, the answers and the routing result. Needs a Calendly plan with routing forms.",
  event: "routing_form_submission.created",
  organizationOnly: true,
  extraOutput: [
    { key: "routingForm", type: "string", label: "Routing Form URI" },
    { key: "submitter", type: "string", label: "Submitter (Invitee URI, if they booked)" },
    { key: "questionsAndAnswers", type: "array", label: "Questions and Answers" },
    { key: "result", type: "object", label: "Routing Result" },
  ],
  extract: (p) => ({
    routingForm: typeof p.routing_form === "string" ? p.routing_form : null,
    submitter: typeof p.submitter === "string" ? p.submitter : null,
    questionsAndAnswers: Array.isArray(p.questions_and_answers) ? p.questions_and_answers : [],
    result: p.result !== null && typeof p.result === "object" ? p.result : null,
  }),
  sample: {
    event: "routing_form_submission.created",
    createdAt: "2026-11-10T10:00:00.000000Z",
    createdBy: "https://api.calendly.com/users/AAAAAAAAAAAAAAAA",
    uri: "https://api.calendly.com/routing_form_submissions/AAAAAAAAAAAAAAAA",
    name: null,
    email: null,
    routingForm: "https://api.calendly.com/routing_forms/AAAAAAAAAAAAAAAA",
    submitter: null,
    questionsAndAnswers: [{ question: "Company size?", answer: "11-50" }],
    result: { type: "event_type", value: "calendly.com/acme/sales" },
    payload: {
      uri: "https://api.calendly.com/routing_form_submissions/AAAAAAAAAAAAAAAA",
      routing_form: "https://api.calendly.com/routing_forms/AAAAAAAAAAAAAAAA",
    },
  },
});

export default routingFormSubmissionCreated;

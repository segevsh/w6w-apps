import { eventTrigger } from "../lib/triggers.ts";

/** A respondent starts a response to the chosen form but has not submitted it. */
const newPartialResponse = eventTrigger({
  key: "new-partial-response",
  title: "New Partial Response",
  description:
    "Fires when someone starts a response to a Typeform form without submitting it. The run gets the response token, the time it was started and the answers given so far.",
  events: ["form_response_partial"],
  sample: {
    eventId: "01HZX0Y7WQ6J5C0FJ8K2S4N3PB",
    eventType: "form_response_partial",
    formId: "lT9Z2j",
    formTitle: "Customer feedback",
    responseId: "b4b23fd78b2476a38109b717218abd26",
    submittedAt: null,
    landedAt: "2026-11-10T10:14:12Z",
    hidden: {},
    answers: [
      { type: "text", text: "Great product", field: { id: "Q1", type: "short_text", ref: "q1" } },
    ],
    calculated: null,
  },
});

export default newPartialResponse;

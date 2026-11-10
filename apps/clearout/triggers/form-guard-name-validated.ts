import { webhookTrigger } from "../lib/triggers.ts";

/** Form Guard validates a name entered in a form (`form_guard.name_validation.completed`). */
const formGuardNameValidated = webhookTrigger({
  key: "form-guard-name-validated",
  title: "Form Guard Name Validated",
  description:
    "Fires when Form Guard finishes validating a name entered in one of your forms. The run gets the validation result, the page URL and the Clearout event envelope.",
  eventType: "form_guard.name_validation.completed",
  sample: {
    eventId: "69f0621ac1b2d86092997d44",
    eventType: "form_guard.name_validation.completed",
    eventMode: "live",
    createdAt: "2026-11-10T07:30:34.280Z",
    status: "success",
    data: {
      result: { input_name: "Ada Lovelace", status: "valid", profanity: false },
      page_url: "https://example.com/contact",
      name: "contact-form",
    },
    payload: {
      event_id: "69f0621ac1b2d86092997d44",
      event_type: "form_guard.name_validation.completed",
      event_mode: "live",
      event_created_on: "2026-11-10T07:30:34.280Z",
      payload: {
        status: "success",
        data: {
          result: { input_name: "Ada Lovelace", status: "valid", profanity: false },
          page_url: "https://example.com/contact",
          name: "contact-form",
        },
      },
    },
  },
});

export default formGuardNameValidated;

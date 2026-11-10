import { webhookTrigger } from "../lib/triggers.ts";

/** Form Guard validates an email entered in a form (`form_guard.email_validation.completed`). */
const formGuardEmailValidated = webhookTrigger({
  key: "form-guard-email-validated",
  title: "Form Guard Email Validated",
  description:
    "Fires when Form Guard finishes validating an email address entered in one of your forms. The run gets the verification result, the page URL and the Clearout event envelope.",
  eventType: "form_guard.email_validation.completed",
  sample: {
    eventId: "69f0621ac1b2d86092997d45",
    eventType: "form_guard.email_validation.completed",
    eventMode: "live",
    createdAt: "2026-11-10T07:30:34.280Z",
    status: "success",
    data: {
      result: { email_address: "ada@example.com", status: "valid", safe_to_send: "yes" },
      page_url: "https://example.com/contact",
      name: "contact-form",
    },
    payload: {
      event_id: "69f0621ac1b2d86092997d45",
      event_type: "form_guard.email_validation.completed",
      event_mode: "live",
      event_created_on: "2026-11-10T07:30:34.280Z",
      payload: {
        status: "success",
        data: {
          result: { email_address: "ada@example.com", status: "valid", safe_to_send: "yes" },
          page_url: "https://example.com/contact",
          name: "contact-form",
        },
      },
    },
  },
});

export default formGuardEmailValidated;

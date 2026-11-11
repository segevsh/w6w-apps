import { webhookTrigger } from "../lib/triggers.ts";

/** Form Guard validates a phone number entered in a form (`form_guard.phone_validation.completed`). */
const formGuardPhoneValidated = webhookTrigger({
  key: "form-guard-phone-validated",
  title: "Form Guard Phone Validated",
  description:
    "Fires when Form Guard finishes validating a phone number entered in one of your forms. The run gets the validation result, the page URL and the Clearout event envelope.",
  eventType: "form_guard.phone_validation.completed",
  sample: {
    eventId: "69f0621ac1b2d86092997d43",
    eventType: "form_guard.phone_validation.completed",
    eventMode: "live",
    createdAt: "2026-11-10T07:30:34.280Z",
    status: "success",
    data: {
      result: { status: "valid", line_type: "fixed_line", carrier: "Example Carrier" },
      page_url: "https://example.com/contact",
      name: "contact-form",
    },
    payload: {
      event_id: "69f0621ac1b2d86092997d43",
      event_type: "form_guard.phone_validation.completed",
      event_mode: "live",
      event_created_on: "2026-11-10T07:30:34.280Z",
      payload: {
        status: "success",
        data: {
          result: { status: "valid", line_type: "fixed_line", carrier: "Example Carrier" },
          page_url: "https://example.com/contact",
          name: "contact-form",
        },
      },
    },
  },
});

export default formGuardPhoneValidated;

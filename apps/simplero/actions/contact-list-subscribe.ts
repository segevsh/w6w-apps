import { contactAction } from "../lib/factory.ts";
import { contactIdParam, refParam } from "../lib/params.ts";

interface Input {
  id: number;
  listId: number;
  skipWelcome?: boolean;
  skipAutoResponses?: boolean;
  requireDoubleOptIn?: boolean;
}

export default contactAction<Input>({
  key: "contact-list-subscribe",
  title: "Subscribe Contact to List",
  description:
    "Subscribe a contact to an email list. By default Simplero sends the list's welcome email " +
    "and starts its auto-responses; the switches below suppress that.",
  action: "list_subscribe",
  idempotent: false,
  params: [
    contactIdParam,
    refParam("listId", "List ID", "The email list to subscribe to, e.g. from List Email Lists."),
    { key: "skipWelcome", label: "Skip welcome email", type: "boolean" },
    { key: "skipAutoResponses", label: "Skip auto-responses", type: "boolean" },
    {
      key: "requireDoubleOptIn",
      label: "Require double opt-in",
      type: "boolean",
      hint: "Send a confirmation email and subscribe only once the contact confirms.",
    },
  ],
  body: (i) => ({
    list_id: i.listId,
    skip_welcome: i.skipWelcome,
    skip_auto_responses: i.skipAutoResponses,
    require_double_opt_in: i.requireDoubleOptIn,
  }),
});

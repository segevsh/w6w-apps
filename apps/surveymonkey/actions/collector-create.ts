import type { ActionDefinition } from "@w6w/types";
import { compact, SurveyMonkeyClient } from "../lib/client.ts";

interface Input {
  surveyId: string;
  type: string;
  name?: string;
  thankYouMessage?: string;
  redirectUrl?: string;
  closeDate?: string;
  allowMultipleResponses?: boolean;
  anonymousType?: string;
  password?: string;
}

/**
 * POST /surveys/{id}/collectors — create a collector (a distribution channel:
 * a weblink, an email invitation, an SMS, or a popup/embedded prompt).
 */
const collectorCreate: ActionDefinition<Input> = {
  key: "collector-create",
  type: "perform",
  resource: "collector",
  title: "Create Collector",
  description: "Create a collector to distribute a survey (weblink, email, SMS or popup).",
  // SurveyMonkey mints a new collector id per call; there is no request key to dedupe on.
  idempotent: false,
  params: [
    { key: "surveyId", label: "Survey ID", type: "string", required: true },
    {
      key: "type",
      label: "Type",
      type: "select",
      required: true,
      options: [
        { value: "weblink", label: "Web link" },
        { value: "email", label: "Email invitation" },
        { value: "sms", label: "SMS" },
        { value: "popup_invitation", label: "Popup invitation" },
        { value: "embedded_survey", label: "Embedded survey" },
        { value: "popup_survey", label: "Popup survey" },
      ],
    },
    { key: "name", label: "Name", type: "string", hint: "Internal collector name." },
    {
      key: "thankYouMessage",
      label: "Thank-you message",
      type: "text",
      hint: 'Defaults to "Thank you for completing our survey!".',
    },
    {
      key: "redirectUrl",
      label: "Redirect URL",
      type: "string",
      hint: "Where to send respondents after completion.",
    },
    {
      key: "closeDate",
      label: "Close date",
      type: "datetime",
      hint: "When this collector stops accepting responses.",
    },
    {
      key: "allowMultipleResponses",
      label: "Allow multiple responses",
      type: "boolean",
      hint: "Defaults to false.",
    },
    {
      key: "anonymousType",
      label: "Anonymity",
      type: "select",
      options: [
        { value: "not_anonymous", label: "Not anonymous" },
        { value: "partially_anonymous", label: "Partially anonymous" },
        { value: "fully_anonymous", label: "Fully anonymous" },
      ],
    },
    {
      key: "password",
      label: "Password",
      type: "secret",
      hint: "Restrict access to respondents who know this password.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Collector ID" },
    { key: "type", type: "string", label: "Type" },
    { key: "href", type: "string", label: "Self link" },
  ],

  execute(input, ctx) {
    const body = compact({
      type: input.type,
      name: input.name,
      thank_you_message: input.thankYouMessage,
      redirect_url: input.redirectUrl,
      close_date: input.closeDate,
      allow_multiple_responses: input.allowMultipleResponses,
      anonymous_type: input.anonymousType,
      password: input.password,
    });

    return new SurveyMonkeyClient(ctx).request(
      `/surveys/${encodeURIComponent(input.surveyId)}/collectors`,
      { method: "POST", body },
    );
  },
};

export default collectorCreate;

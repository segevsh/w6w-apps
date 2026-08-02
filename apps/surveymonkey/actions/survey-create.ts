import type { ActionDefinition } from "@w6w/types";
import { compact, SurveyMonkeyClient } from "../lib/client.ts";

interface Input {
  title?: string;
  nickname?: string;
  language?: string;
  folderId?: string;
  fromSurveyId?: string;
  fromTemplateId?: string;
  footer?: boolean;
  definition?: Record<string, unknown>;
}

/**
 * POST /surveys — create a new survey. Empty by default ("New Survey"), or
 * seeded from an existing survey (`from_survey_id`) or a template
 * (`from_template_id`). Extra body fields (buttons_text, custom_variables,
 * quiz_options, …) can be supplied via `definition` and are merged in.
 */
const surveyCreate: ActionDefinition<Input> = {
  key: "survey-create",
  type: "perform",
  resource: "survey",
  title: "Create Survey",
  description: "Create a SurveyMonkey survey, optionally from a template or an existing survey.",
  // SurveyMonkey mints a new survey id per call; there is no request key to dedupe on.
  idempotent: false,
  params: [
    { key: "title", label: "Title", type: "string", hint: 'Defaults to "New Survey".' },
    { key: "nickname", label: "Nickname", type: "string" },
    {
      key: "language",
      label: "Language",
      type: "string",
      hint: 'ISO language code, e.g. "en". Defaults to "en".',
    },
    { key: "folderId", label: "Folder ID", type: "string", hint: "Add the survey to this folder." },
    {
      key: "fromSurveyId",
      label: "Copy from survey ID",
      type: "string",
      hint: "Create by copying an existing survey.",
    },
    {
      key: "fromTemplateId",
      label: "Create from template ID",
      type: "string",
      hint: "Create by starting from a SurveyMonkey template.",
    },
    {
      key: "footer",
      label: "Show SurveyMonkey branding",
      type: "boolean",
      hint: "Defaults to true.",
    },
    {
      key: "definition",
      label: "Extra properties",
      type: "json",
      hint:
        "Additional body fields merged in verbatim (buttons_text, custom_variables, quiz_options, …).",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Survey ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "href", type: "string", label: "Self link" },
  ],

  execute(input, ctx) {
    const body = compact({
      ...(input.definition ?? {}),
      title: input.title,
      nickname: input.nickname,
      language: input.language,
      folder_id: input.folderId,
      from_survey_id: input.fromSurveyId,
      from_template_id: input.fromTemplateId,
      footer: input.footer,
    });

    return new SurveyMonkeyClient(ctx).request("/surveys", { method: "POST", body });
  },
};

export default surveyCreate;

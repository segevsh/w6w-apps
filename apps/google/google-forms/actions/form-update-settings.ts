import type { ActionDefinition } from "@w6w/types";
import { batchUpdate, deriveUpdateMask, singleRequestBody } from "../lib/client.ts";

interface Input {
  formId: string;
  isQuiz?: boolean;
  emailCollectionType?: string;
  updateMask?: string;
  includeFormInResponse?: boolean;
}

/**
 * `updateSettings` via `forms.batchUpdate`.
 *
 * `FormSettings` has exactly two fields — `quizSettings` and
 * `emailCollectionType` — so those are the only two knobs here. Turning
 * `isQuiz` off **deletes all question grading**, per the schema description;
 * that is Google's behaviour, not something this app can soften.
 *
 * The mask paths are the nested ones (`quizSettings.isQuiz`), with the
 * `settings` root implied.
 */
const formUpdateSettings: ActionDefinition<Input> = {
  key: "form-update-settings",
  type: "perform",
  resource: "form",
  title: "Update Form Settings",
  description: "Turn a form into a quiz (or back) and set how respondent emails are collected.",
  idempotent: true,
  params: [
    { key: "formId", label: "Form ID or URL", type: "string", required: true },
    {
      key: "isQuiz",
      label: "Is Quiz",
      type: "boolean",
      hint: "Setting this to false deletes all per-question grading.",
    },
    {
      key: "emailCollectionType",
      label: "Email Collection",
      type: "select",
      options: [
        { value: "DO_NOT_COLLECT", label: "Do not collect" },
        { value: "VERIFIED", label: "Verified (signed-in account)" },
        { value: "RESPONDER_INPUT", label: "Responder input (typed field)" },
      ],
    },
    {
      key: "updateMask",
      label: "Update Mask",
      type: "string",
      hint:
        "Comma-separated field paths relative to `settings` (e.g. `quizSettings.isQuiz`), or `*`. Derived from the fields you fill in when left blank.",
    },
    { key: "includeFormInResponse", label: "Include Form In Response", type: "boolean" },
  ],
  output: [
    { key: "form", type: "object", label: "Updated form (when requested)" },
    { key: "replies", type: "array", label: "One reply per request" },
    { key: "writeControl", type: "object", label: "Resulting write control" },
  ],

  execute(input, ctx) {
    const settings: Record<string, unknown> = {};
    // Mask paths are nested; `settings` itself is implied and must not appear.
    const maskable: Record<string, unknown> = {};
    if (input.isQuiz !== undefined) {
      settings.quizSettings = { isQuiz: input.isQuiz };
      maskable["quizSettings.isQuiz"] = input.isQuiz;
    }
    if (input.emailCollectionType !== undefined) {
      settings.emailCollectionType = input.emailCollectionType;
      maskable["emailCollectionType"] = input.emailCollectionType;
    }
    const updateMask = deriveUpdateMask(input.updateMask, maskable);

    return batchUpdate(
      ctx,
      input.formId,
      singleRequestBody({ updateSettings: { settings, updateMask } }, {
        includeFormInResponse: input.includeFormInResponse,
      }),
    );
  },
};

export default formUpdateSettings;

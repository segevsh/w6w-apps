import type { ActionDefinition } from "@w6w/types";
import { batchUpdate, deriveUpdateMask, singleRequestBody } from "../lib/client.ts";

interface Input {
  formId: string;
  title?: string;
  description?: string;
  updateMask?: string;
  includeFormInResponse?: boolean;
}

/**
 * `updateFormInfo` via `forms.batchUpdate`.
 *
 * `updateMask` is **required** by the API and must name at least one field,
 * with the `info` root implied (so `title`, not `info.title`). When the caller
 * leaves it blank we derive it from the fields they actually filled in, which
 * makes "just change the description" behave the way you'd expect.
 *
 * `info.documentTitle` is output-only outside of `forms.create`, so it is not
 * offered here — rename the file in Drive instead.
 */
const formUpdateInfo: ActionDefinition<Input> = {
  key: "form-update-info",
  type: "perform",
  resource: "form",
  title: "Update Form Info",
  description: "Change a form's title and/or description.",
  idempotent: true,
  params: [
    { key: "formId", label: "Form ID or URL", type: "string", required: true },
    { key: "title", label: "Title", type: "string" },
    { key: "description", label: "Description", type: "text" },
    {
      key: "updateMask",
      label: "Update Mask",
      type: "string",
      hint:
        "Comma-separated field paths relative to `info` (e.g. `title,description`), or `*`. Derived from the fields you fill in when left blank.",
    },
    { key: "includeFormInResponse", label: "Include Form In Response", type: "boolean" },
  ],
  output: [
    { key: "form", type: "object", label: "Updated form (when requested)" },
    { key: "replies", type: "array", label: "One reply per request" },
    { key: "writeControl", type: "object", label: "Resulting write control" },
  ],

  execute(input, ctx) {
    const info: Record<string, unknown> = {};
    if (input.title !== undefined) info.title = input.title;
    if (input.description !== undefined) info.description = input.description;
    const updateMask = deriveUpdateMask(input.updateMask, info);

    return batchUpdate(
      ctx,
      input.formId,
      singleRequestBody({ updateFormInfo: { info, updateMask } }, {
        includeFormInResponse: input.includeFormInResponse,
      }),
    );
  },
};

export default formUpdateInfo;

import type { ActionDefinition } from "@w6w/types";
import { extractFormId, GoogleFormsClient } from "../lib/client.ts";

interface Input {
  formId: string;
  isPublished: boolean;
  isAcceptingResponses: boolean;
  updateMask?: string;
}

/**
 * `forms.setPublishSettings` — POST /v1/forms/{formId}:setPublishSettings
 *
 * Its own method, not a batchUpdate request. `PublishState` has two required
 * booleans: `isPublished` (visible to responders at all) and
 * `isAcceptingResponses` (still taking submissions). Setting `isPublished`
 * false forces `isAcceptingResponses` false server-side.
 *
 * `updateMask` accepts `publishState` or `*`. Legacy forms without a
 * `publishSettings` field are not supported by this method — forms created
 * through the API after 2026-06-30 default to unpublished, which is what makes
 * this the companion call to `form-create`.
 */
const formSetPublishSettings: ActionDefinition<Input> = {
  key: "form-set-publish-settings",
  type: "perform",
  resource: "form",
  title: "Set Publish Settings",
  description: "Publish or unpublish a form and start or stop accepting responses.",
  idempotent: true,
  params: [
    { key: "formId", label: "Form ID or URL", type: "string", required: true },
    {
      key: "isPublished",
      label: "Published",
      type: "boolean",
      required: true,
      hint: "Whether the form is visible to responders.",
    },
    {
      key: "isAcceptingResponses",
      label: "Accepting Responses",
      type: "boolean",
      required: true,
      hint: "Forced to false when the form is not published.",
    },
    {
      key: "updateMask",
      label: "Update Mask",
      type: "string",
      hint: "`publishState` (the default) or `*`.",
      default: "publishState",
    },
  ],
  output: [
    { key: "formId", type: "string", label: "Form ID" },
    { key: "publishSettings", type: "object", label: "Applied publish settings" },
  ],

  execute(input, ctx) {
    const client = new GoogleFormsClient(ctx);
    return client.request(
      `/forms/${encodeURIComponent(extractFormId(input.formId))}:setPublishSettings`,
      {
        method: "POST",
        body: {
          publishSettings: {
            publishState: {
              isPublished: input.isPublished,
              isAcceptingResponses: input.isAcceptingResponses,
            },
          },
          updateMask: input.updateMask ?? "publishState",
        },
      },
    );
  },
};

export default formSetPublishSettings;

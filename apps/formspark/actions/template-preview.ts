import type { ActionDefinition } from "@w6w/types";
import { FormsparkClient, seg } from "../lib/client.ts";
import { formIdParam, templateKindParam } from "../lib/params.ts";

interface Input {
  formId: string;
  kind: string;
  data?: Record<string, unknown> | string;
}

/**
 * `POST /forms/{formId}/templates/{kind}/preview` — renders the stored template to HTML and
 * plain text. A POST, but it changes nothing, so it is a `read`. `data` is stand-in submission
 * data; omitted, Formspark derives example data from the form's own recent submissions.
 */
const templatePreview: ActionDefinition<Input> = {
  key: "template-preview",
  type: "read",
  resource: "template",
  title: "Preview Email Template",
  description: "Render a form's stored email template as HTML and plain text. Nothing is sent " +
    "or changed.",
  params: [
    formIdParam,
    templateKindParam,
    {
      key: "data",
      label: "Stand-in submission data",
      type: "json",
      hint: "JSON object the template renders against. Defaults to example data derived from " +
        "the form's recent submissions.",
    },
  ],
  output: [
    { key: "html", type: "string", label: "Rendered HTML" },
    { key: "text", type: "string", label: "Rendered plain-text alternative" },
  ],

  execute(input, ctx) {
    let data = input.data;
    if (typeof data === "string") {
      if (data.trim() === "") data = undefined;
      else {
        try {
          data = JSON.parse(data);
        } catch {
          throw new Error("Formspark: data must be a JSON object");
        }
      }
    }
    if (data !== undefined && (data === null || typeof data !== "object" || Array.isArray(data))) {
      throw new Error("Formspark: data must be a JSON object");
    }
    return new FormsparkClient(ctx).request(
      `/forms/${seg(input.formId, "formId")}/templates/${seg(input.kind, "kind")}/preview`,
      { method: "POST", body: data === undefined ? {} : { data } },
    );
  },
};

export default templatePreview;

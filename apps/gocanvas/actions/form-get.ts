import type { ActionDefinition } from "@w6w/types";
import { encodeId, GoCanvasClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

interface Input {
  formId: number;
  format?: string;
}

const formGet: ActionDefinition<Input> = {
  key: "form-get",
  type: "read",
  resource: "form",
  title: "Get Form",
  description:
    "Fetch a form definition. flat is what most clients want (one object with everything needed to render the form); minimal lists the entry ids a Submission or Dispatch needs; nested is the full builder shape; metadata names the published version.",
  params: [
    idParam("formId", "Form ID"),
    {
      key: "format",
      label: "Format",
      type: "select",
      default: "flat",
      options: [{ value: "flat", label: "flat" }, { value: "minimal", label: "minimal" }, {
        value: "nested",
        label: "nested",
      }, { value: "metadata", label: "metadata" }],
    },
  ],
  output: [
    { key: "data", type: "object", label: "The form definition" },
  ],

  execute(input, ctx) {
    return new GoCanvasClient(ctx).request(`/forms/${encodeId(input.formId)}`, {
      query: { format: input.format },
    });
  },
};

export default formGet;

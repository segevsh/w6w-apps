import type { ActionDefinition } from "@w6w/types";
import { JotformClient } from "../lib/client.ts";

interface Input {
  formId: string;
}

/** GET /form/{formID} — basic information about one form. */
const formGet: ActionDefinition<Input> = {
  key: "form-get",
  type: "read",
  resource: "form",
  title: "Get Form",
  description: "Retrieve one form's basic details by ID.",
  params: [
    {
      key: "formId",
      label: "Form ID",
      type: "string",
      required: true,
      hint: "The digits in a form's URL. Get IDs from Get Many Forms.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Form ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "status", type: "string", label: "Status (ENABLED / DISABLED / DELETED)" },
    { key: "count", type: "string", label: "Total submissions" },
    { key: "new", type: "string", label: "Unread submissions" },
    { key: "url", type: "string", label: "Public form URL" },
  ],

  execute(input, ctx) {
    return new JotformClient(ctx).content<Record<string, unknown>>(
      `/form/${encodeURIComponent(input.formId)}`,
    );
  },
};

export default formGet;

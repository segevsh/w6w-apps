import type { ActionDefinition } from "@w6w/types";
import { TypeformClient } from "../lib/client.ts";

interface Input {
  title: string;
  type?: string;
  workspaceHref?: string;
  themeHref?: string;
  definition?: Record<string, unknown>;
}

/**
 * POST /forms — create a form. `title` is the only field this action requires;
 * the full form definition (fields, settings, logic, screens) can be supplied
 * as a JSON object under `definition`, which is spread onto the request body.
 */
const formCreate: ActionDefinition<Input> = {
  key: "form-create",
  type: "perform",
  resource: "form",
  title: "Create Form",
  description: "Create a Typeform form from a title and an optional full form definition.",
  // Typeform mints a new form id per call; there is no request key to dedupe on.
  idempotent: false,
  params: [
    { key: "title", label: "Title", type: "string", required: true },
    {
      key: "type",
      label: "Type",
      type: "select",
      options: [
        { value: "form", label: "Form" },
        { value: "quiz", label: "Quiz" },
      ],
      hint: "Defaults to a standard form when omitted.",
    },
    {
      key: "workspaceHref",
      label: "Workspace URL",
      type: "string",
      hint:
        "Self link of the workspace to create the form in, e.g. https://api.typeform.com/workspaces/abc123.",
    },
    {
      key: "themeHref",
      label: "Theme URL",
      type: "string",
      hint: "Self link of the theme to apply, e.g. https://api.typeform.com/themes/abc123.",
    },
    {
      key: "definition",
      label: "Form definition",
      type: "json",
      hint:
        "Additional form properties merged into the request body (fields, settings, logic, screens, …).",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Form ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "_links", type: "object", label: "Links" },
  ],

  execute(input, ctx) {
    const body: Record<string, unknown> = {
      ...(input.definition ?? {}),
      title: input.title,
    };
    if (input.type) body.type = input.type;
    if (input.workspaceHref) body.workspace = { href: input.workspaceHref };
    if (input.themeHref) body.theme = { href: input.themeHref };

    return new TypeformClient(ctx).request("/forms", { method: "POST", body });
  },
};

export default formCreate;

import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, IClosedClient } from "../lib/client.ts";

/**
 * `PUT /v1/fields` — Update a custom field.
 *
 * Verified 2026-10-06 against iClosed's OpenAPI 3.0 document
 * (`api-docs-iclosed.redocly.app/_bundle/openapi/v1/openapi.yaml`). The vendor's
 * parsed body is returned verbatim; see `lib/client.ts` for why nothing is unwrapped.
 */
interface Input {
  id: number;
  name?: string;
  identifier?: string;
  description?: string;
  configuration?: unknown;
  options?: unknown;
  hidden?: boolean;
  isSecondaryQuestion?: boolean;
}

const fieldUpdate: ActionDefinition<Input> = {
  key: "field-update",
  type: "perform",
  resource: "field",
  title: "Update custom field",
  description: "Update a custom field.",
  idempotent: true,
  params: [
    {
      key: "id",
      label: "Field ID",
      type: "number",
      validation: { integer: true },
      required: true,
    },
    {
      key: "name",
      label: "Name",
      type: "string",
    },
    {
      key: "identifier",
      label: "Identifier",
      type: "string",
    },
    {
      key: "description",
      label: "Description",
      type: "string",
    },
    {
      key: "configuration",
      label: "Configuration",
      type: "json",
      hint: "JSON object.",
    },
    {
      key: "options",
      label: "Options",
      type: "json",
      hint:
        'JSON array of {"name","color","displayIndex"} objects. Colors: blue, indigo, purple, green, yellow, red, pink, gray.',
    },
    {
      key: "hidden",
      label: "Hidden",
      type: "boolean",
    },
    {
      key: "isSecondaryQuestion",
      label: "Secondary question",
      type: "boolean",
    },
  ],
  output: [
    { key: "message", type: "string", label: "Result message" },
    { key: "status", type: "number", label: "Status" },
    { key: "data", type: "object", label: "The field" },
  ],

  execute(input, ctx) {
    return new IClosedClient(ctx).json("/fields", {
      method: "PUT",
      body: compact({
        id: input.id,
        name: input.name,
        identifier: input.identifier,
        description: input.description,
        configuration: asOptionalJson(input.configuration, "Configuration"),
        options: asOptionalJson(input.options, "Options"),
        hidden: input.hidden,
        isSecondaryQuestion: input.isSecondaryQuestion,
      }),
    });
  },
};

export default fieldUpdate;

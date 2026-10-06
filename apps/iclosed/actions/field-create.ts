import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, IClosedClient } from "../lib/client.ts";

/**
 * `POST /v1/fields` — Create a custom field on an object type.
 *
 * Verified 2026-10-06 against iClosed's OpenAPI 3.0 document
 * (`api-docs-iclosed.redocly.app/_bundle/openapi/v1/openapi.yaml`). The vendor's
 * parsed body is returned verbatim; see `lib/client.ts` for why nothing is unwrapped.
 */
interface Input {
  name: string;
  inputType: string;
  type: string;
  identifier?: string;
  description?: string;
  configuration?: unknown;
  options?: unknown;
  isSecondaryQuestion?: boolean;
}

const fieldCreate: ActionDefinition<Input> = {
  key: "field-create",
  type: "perform",
  resource: "field",
  title: "Create custom field",
  description: "Create a custom field on an object type.",
  idempotent: false,
  params: [
    {
      key: "name",
      label: "Name",
      type: "string",
      required: true,
    },
    {
      key: "inputType",
      label: "Input type",
      type: "select",
      options: [
        { value: "NUMBER", label: "Number" },
        { value: "TEXT", label: "Text" },
        { value: "TEXT_AREA", label: "Text Area" },
        { value: "DATE", label: "Date" },
        { value: "CHECK_BOX", label: "Check Box" },
        { value: "RADIO_BUTTON", label: "Radio Button" },
        { value: "USER", label: "User" },
        { value: "USERS_MULTIPLE", label: "Users Multiple" },
        { value: "URL", label: "Url" },
        { value: "SINGLE_SELECT", label: "Single Select" },
        { value: "MULTIPLE_SELECT", label: "Multiple Select" },
        { value: "EMAIL", label: "Email" },
        { value: "RATING", label: "Rating" },
      ],
      required: true,
    },
    {
      key: "type",
      label: "Object type",
      type: "select",
      options: [
        { value: "CONTACT", label: "Contact" },
        { value: "CALL", label: "Call" },
        { value: "EVENT", label: "Event" },
        { value: "DEAL", label: "Deal" },
        { value: "USER", label: "User" },
        { value: "ISCORE", label: "iScore" },
      ],
      required: true,
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
      hint: "JSON object; shape depends on the input type.",
    },
    {
      key: "options",
      label: "Options",
      type: "json",
      hint:
        'JSON array of {"name","color","displayIndex"} objects. Colors: blue, indigo, purple, green, yellow, red, pink, gray.',
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
      method: "POST",
      body: compact({
        name: input.name,
        inputType: input.inputType,
        type: input.type,
        identifier: input.identifier,
        description: input.description,
        configuration: asOptionalJson(input.configuration, "Configuration"),
        options: asOptionalJson(input.options, "Options"),
        isSecondaryQuestion: input.isSecondaryQuestion,
      }),
    });
  },
};

export default fieldCreate;

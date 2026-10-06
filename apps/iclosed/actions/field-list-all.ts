import type { ActionDefinition } from "@w6w/types";
import { IClosedClient } from "../lib/client.ts";

/**
 * `GET /v1/fields/objects/all` — List custom fields for every object type, grouped by type.
 *
 * Verified 2026-10-06 against iClosed's OpenAPI 3.0 document
 * (`api-docs-iclosed.redocly.app/_bundle/openapi/v1/openapi.yaml`). The vendor's
 * parsed body is returned verbatim; see `lib/client.ts` for why nothing is unwrapped.
 */
interface Input {
  page?: number;
  limit?: number;
  search?: string;
  inputType?: string;
  showSystemFields?: string;
  inviteeQuestions?: string;
}

const fieldListAll: ActionDefinition<Input> = {
  key: "field-list-all",
  type: "read",
  resource: "field",
  title: "List all custom fields",
  description: "List custom fields for every object type, grouped by type.",
  params: [
    {
      key: "page",
      label: "Page",
      type: "number",
      validation: { integer: true },
      hint: "Zero-based page index. Default 0.",
    },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      validation: { integer: true },
      hint: "Maximum items per object-type slice.",
    },
    {
      key: "search",
      label: "Search",
      type: "string",
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
    },
    {
      key: "showSystemFields",
      label: "Show system fields",
      type: "select",
      options: [{ value: "true", label: "Yes" }, { value: "false", label: "No" }],
    },
    {
      key: "inviteeQuestions",
      label: "Invitee questions only",
      type: "select",
      options: [{ value: "true", label: "Yes" }, { value: "false", label: "No" }],
    },
  ],
  output: [
    { key: "data", type: "object", label: "Fields keyed by object type" },
  ],

  execute(input, ctx) {
    return new IClosedClient(ctx).json("/fields/objects/all", {
      query: {
        page: input.page,
        limit: input.limit,
        search: input.search,
        inputType: input.inputType,
        showSystemFields: input.showSystemFields,
        inviteeQuestions: input.inviteeQuestions,
      },
    });
  },
};

export default fieldListAll;

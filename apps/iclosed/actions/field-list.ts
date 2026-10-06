import type { ActionDefinition } from "@w6w/types";
import { IClosedClient } from "../lib/client.ts";

/**
 * `GET /v1/fields/objects` — List the custom fields of one object type.
 *
 * Verified 2026-10-06 against iClosed's OpenAPI 3.0 document
 * (`api-docs-iclosed.redocly.app/_bundle/openapi/v1/openapi.yaml`). The vendor's
 * parsed body is returned verbatim; see `lib/client.ts` for why nothing is unwrapped.
 */
interface Input {
  objectType: string;
  page?: number;
  limit?: number;
  search?: string;
  inputType?: string;
  showSystemFields?: string;
  inviteeQuestions?: string;
  identifiers?: string;
}

const fieldList: ActionDefinition<Input> = {
  key: "field-list",
  type: "read",
  resource: "field",
  title: "List custom fields",
  description: "List the custom fields of one object type.",
  params: [
    {
      key: "objectType",
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
      hint: "Records per page.",
    },
    {
      key: "search",
      label: "Search",
      type: "string",
      hint: "Matches field name or identifier.",
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
    {
      key: "identifiers",
      label: "Identifiers",
      type: "string",
      hint: "Comma-separated field identifiers.",
    },
  ],
  output: [
    { key: "count", type: "number", label: "Total fields" },
    { key: "data", type: "array", label: "Fields" },
    { key: "hasMore", type: "boolean", label: "More pages exist" },
    { key: "nextPage", type: "number", label: "Next page index" },
  ],

  execute(input, ctx) {
    return new IClosedClient(ctx).json("/fields/objects", {
      query: {
        objectType: input.objectType,
        page: input.page,
        limit: input.limit,
        search: input.search,
        inputType: input.inputType,
        showSystemFields: input.showSystemFields,
        inviteeQuestions: input.inviteeQuestions,
        identifiers: input.identifiers,
      },
    });
  },
};

export default fieldList;

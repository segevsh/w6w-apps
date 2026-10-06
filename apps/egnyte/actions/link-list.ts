import type { ActionDefinition } from "@w6w/types";
import { EgnyteClient, unset } from "../lib/client.ts";

interface Input {
  path?: string;
  username?: string;
  type?: string;
  accessibility?: string;
  createdBefore?: string;
  createdAfter?: string;
  offset?: number;
  count?: number;
}

const linkList: ActionDefinition<Input> = {
  key: "link-list",
  type: "search",
  resource: "link",
  title: "List Links",
  description:
    "List shareable links with full details. Non-admins see only the links they created; admins see every link in the domain.",
  params: [
    { key: "path", label: "Path", type: "string", row: "filter", hint: "Only links to this item." },
    { key: "username", label: "Created by", type: "string", row: "filter" },
    {
      key: "type",
      label: "Type",
      type: "select",
      row: "filter",
      options: [{ value: "file", label: "File" }, { value: "folder", label: "Folder" }],
    },
    {
      key: "accessibility",
      label: "Accessibility",
      type: "select",
      row: "filter",
      options: [
        { value: "anyone", label: "Anyone" },
        { value: "password", label: "Password" },
        { value: "domain", label: "Domain" },
        { value: "recipients", label: "Recipients" },
      ],
    },
    {
      key: "createdAfter",
      label: "Created after",
      type: "string",
      advanced: true,
      hint: "ISO-8601 or YYYY-MM-DD.",
    },
    {
      key: "createdBefore",
      label: "Created before",
      type: "string",
      advanced: true,
      hint: "ISO-8601 or YYYY-MM-DD.",
    },
    {
      key: "offset",
      label: "Offset",
      type: "number",
      advanced: true,
      row: "page",
      validation: { min: 0, integer: true },
    },
    {
      key: "count",
      label: "Count",
      type: "number",
      advanced: true,
      row: "page",
      validation: { min: 1, max: 500, integer: true },
      hint: "Egnyte caps this at 500.",
    },
  ],
  output: [
    { key: "links", type: "array", label: "Links" },
    { key: "count", type: "number", label: "Count" },
  ],

  execute(input, ctx) {
    return new EgnyteClient(ctx).request("/v2/links", {
      query: {
        path: unset(input.path),
        username: unset(input.username),
        type: input.type,
        accessibility: input.accessibility,
        created_before: unset(input.createdBefore),
        created_after: unset(input.createdAfter),
        offset: input.offset,
        count: input.count,
      },
    });
  },
};

export default linkList;

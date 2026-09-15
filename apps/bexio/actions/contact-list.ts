import type { ActionDefinition } from "@w6w/types";
import { BexioClient, listQuery } from "../lib/client.ts";

interface Input {
  orderBy?: "id" | "nr" | "name_1" | "updated_at";
  descending?: boolean;
  limit?: number;
  offset?: number;
  showArchived?: boolean;
}

const contactList: ActionDefinition<Input> = {
  key: "contact-list",
  type: "read",
  resource: "contact",
  title: "List Contacts",
  description: "Fetch a page of contacts (companies and persons).",
  params: [
    {
      key: "orderBy",
      label: "Sort by",
      type: "select",
      options: [
        { value: "id", label: "ID" },
        { value: "nr", label: "Contact number" },
        { value: "name_1", label: "Name" },
        { value: "updated_at", label: "Last updated" },
      ],
      default: "id",
    },
    { key: "descending", label: "Descending", type: "boolean", default: false },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      default: 100,
      hint: "Max 2000; the vendor default is 500.",
    },
    { key: "offset", label: "Offset", type: "number", default: 0 },
    { key: "showArchived", label: "Show archived only", type: "boolean", default: false },
  ],
  output: [
    { key: "id", type: "number", label: "ID" },
    { key: "nr", type: "string", label: "Contact number" },
    { key: "name_1", type: "string", label: "Name / company" },
  ],

  execute(input, ctx) {
    return new BexioClient(ctx).list("/2.0/contact", listQuery(input));
  },
};

export default contactList;

import type { ActionDefinition } from "@w6w/types";
import { RedtailClient, type RedtailMeta } from "../lib/client.ts";
import type { RedtailContact } from "../lib/types.ts";
import { pageParams, pageQuery } from "../lib/params.ts";

interface Input {
  page?: number;
  pagesize?: number;
  include?: string;
}

interface Output {
  meta?: RedtailMeta;
  contacts: RedtailContact[];
}

const contactList: ActionDefinition<Input, Output> = {
  key: "contact-list",
  type: "search",
  resource: "contact",
  title: "List Contacts",
  description: "List contacts in the connected database, page by page.",
  params: [
    ...pageParams,
    {
      key: "pagesize",
      label: "Page size",
      type: "number",
      advanced: true,
      validation: { min: 1, integer: true },
      hint: "Overrides the default page size of 50. Sent as a request header, per the docs.",
    },
    {
      key: "include",
      label: "Include",
      type: "string",
      advanced: true,
      hint: "Comma-separated dependent records to attach to each contact, e.g. " +
        "addresses,phones,emails,urls,family,tag_memberships. Sent as a request header.",
    },
  ],
  output: [
    { key: "contacts", type: "array", label: "Contacts" },
    { key: "meta.total_records", type: "number", label: "Total records" },
    { key: "meta.total_pages", type: "number", label: "Total pages" },
  ],

  async execute(input, ctx) {
    const res = await new RedtailClient(ctx).request<Output>("/contacts", {
      query: pageQuery(input),
      headers: { pagesize: input.pagesize, include: input.include },
    });
    return { contacts: res.data.contacts ?? [], meta: res.meta };
  },
};

export default contactList;

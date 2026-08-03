import type { ActionDefinition } from "@w6w/types";
import { KajabiClient, unset } from "../lib/client.ts";
import {
  collectionOutput,
  pageNumberParam,
  pageSizeParam,
  siteFilterParam,
  sortParam,
} from "../lib/params.ts";

/**
 * `GET /v1/contact_notes` — the notes on a contact.
 *
 * `filter[contact_id]` is what makes this useful; without it the call returns
 * every note on the site, which is rarely what a workflow wants. The spec does
 * not mark it required, so this app does not either — but the param is listed
 * first and described as the normal usage.
 */
interface Input {
  contactId?: string;
  siteId?: string;
  sort?: string;
  pageNumber?: number;
  pageSize?: number;
}

const contactNoteList: ActionDefinition<Input> = {
  key: "contact-note-list",
  type: "search",
  resource: "contact-note",
  title: "List Contact Notes",
  description:
    "List contact notes, normally filtered to one contact. Without a contact filter this " +
    "returns every note on the site.",
  params: [
    {
      key: "contactId",
      label: "Contact ID",
      type: "string",
      hint: "Sent as `filter[contact_id]`. Almost always what you want — omit it and you get " +
        "the whole site's notes.",
    },
    siteFilterParam,
    sortParam("created_at"),
    pageNumberParam,
    pageSizeParam,
  ],
  output: collectionOutput,

  execute(input, ctx) {
    return new KajabiClient(ctx).request("/contact_notes", {
      query: {
        "filter[contact_id]": unset(input.contactId),
        "filter[site_id]": unset(input.siteId),
        sort: unset(input.sort),
        "page[number]": input.pageNumber,
        "page[size]": input.pageSize,
      },
    });
  },
};

export default contactNoteList;

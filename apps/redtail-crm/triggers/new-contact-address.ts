import type { ActionDefinition } from "@w6w/types";
import { pagedSnapshotTrigger } from "../lib/triggers.ts";
import contactAddressList from "../actions/contact-address-list.ts";

/**
 * The addresses of one contact.
 * Redtail documents no sort order and no created-since filter on this list (TWAPI Documentation,
 * https://documenter.getpostman.com/view/7873823/SVzxXyzn), so each check reads every page
 * (`meta.total_pages`, at most 20) and diffs ids.
 */
export default pagedSnapshotTrigger({
  key: "new-contact-address",
  title: "New Contact Address",
  description: "The run gets each address newly added to the chosen contact.",
  action: contactAddressList as unknown as ActionDefinition,
  maxPages: 20,
  params: [
    {
      key: "contactId",
      label: "Contact ID",
      type: "number",
      required: true,
      hint: "The Redtail contact to watch.",
    },
  ],
  input: (params) => ({ contactId: params.contactId }),
  items: (result) => (result as { addresses?: unknown[] }).addresses ?? [],
  output: [
    { key: "id", type: "number", label: "Address ID" },
    { key: "street_address", type: "string", label: "Street" },
    { key: "city", type: "string", label: "City" },
    { key: "address_type_description", type: "string", label: "Address type" },
  ],
  sample: {
    id: 3,
    street_address: "814 Broadway St",
    city: "Sacramento",
    address_type_description: "Work",
  },
});

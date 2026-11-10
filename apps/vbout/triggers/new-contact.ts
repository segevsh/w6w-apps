import contactList from "../actions/contact-list.ts";
import { itemsOf, snapshotTrigger } from "../lib/triggers.ts";

/**
 * `GET /1/emailmarketing/getcontacts.json?listid=<id>` through `contact-list`: documented with
 * only the `listid` parameter (no paging, order or since filter,
 * https://developers.vbout.com/scripts/openapi.json, `EmailMarketing/GetContacts`) and returns every
 * contact of the list, so the list is snapshot-diffed (additions only). A list of more than 5000
 * contacts makes the check fail with an error naming the cap.
 */
export default snapshotTrigger({
  key: "new-contact",
  title: "New Contact",
  description: "The run gets each contact newly added to a Vbout contact list.",
  params: [{
    key: "listId",
    label: "List ID",
    type: "string",
    required: true,
    hint: "The contact list to watch.",
  }],
  output: [
    { key: "id", type: "string", label: "Contact ID" },
    { key: "email", type: "string", label: "Email" },
    { key: "status", type: "string", label: "Status" },
    { key: "registration_date", type: "string", label: "Registration date" },
  ],
  sample: { id: "3", email: "jim@example.com", status: "1", registration_date: "11/30/2014 00:00" },
  rows: async (params, ctx) =>
    itemsOf(await contactList.execute({ listId: String(params.listId) } as never, ctx), "contacts"),
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
});

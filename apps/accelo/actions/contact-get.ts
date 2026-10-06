import { getAction } from "../lib/actions.ts";

export default getAction({
  key: "contact-get",
  resource: "contact",
  path: "/contacts",
  idKey: "contactId",
  idLabel: "Contact ID",
  title: "Get Contact",
  description: "Fetch one contact by id. Phone and email live on the contact's affiliation.",
});

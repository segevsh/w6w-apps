import { listAction } from "../lib/actions.ts";

export default listAction({
  key: "contact-list",
  resource: "contact",
  path: "/contacts",
  title: "List Contacts",
  description: "List contacts. Search covers first name, surname, mobile and email.",
});

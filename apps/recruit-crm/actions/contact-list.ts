import { listAction } from "../lib/params.ts";

export default listAction({
  key: "contact-list",
  resource: "contact",
  title: "List Contacts",
  description: "List contacts, one page at a time (`GET /v1/contacts`).",
  path: "/contacts",
});

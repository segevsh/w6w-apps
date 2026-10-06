import { listAction, pagingParams } from "../lib/factory.ts";

/** `GET /v4/contacts` — limit and offset only; the vendor default page is 20. */
export default listAction({
  key: "contact-list",
  title: "List Contacts",
  description: "List contacts in the account, page by page.",
  resource: "contact",
  path: "/contacts",
  params: pagingParams,
});

import { getAction } from "../lib/factory.ts";

/** `GET /v4/contacts/{email}` */
export default getAction({
  key: "contact-get",
  title: "Get Contact",
  description: "Load one contact by email address, with status, custom fields and send activity.",
  resource: "contact",
  path: "/contacts/{id}",
  idKey: "email",
  idLabel: "Email",
  outputKey: "Email",
});

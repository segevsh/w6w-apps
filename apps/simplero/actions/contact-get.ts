import { getAction } from "../lib/factory.ts";

export default getAction({
  key: "contact-get",
  resource: "contact",
  title: "Get Contact",
  description: "Fetch one contact (Simplero's `customers` resource) by its numeric id.",
  path: "/customers",
  idLabel: "Contact ID",
  outputLabel: "Contact",
});

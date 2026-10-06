import { contactAction } from "../lib/factory.ts";
import { contactIdParam, refParam } from "../lib/params.ts";

interface Input {
  id: number;
  listId: number;
}

export default contactAction<Input>({
  key: "contact-list-unsubscribe",
  title: "Unsubscribe Contact from List",
  description: "Unsubscribe a contact from one email list.",
  action: "list_unsubscribe",
  idempotent: false,
  params: [contactIdParam, refParam("listId", "List ID", "The email list to unsubscribe from.")],
  body: (i) => ({ list_id: i.listId }),
});

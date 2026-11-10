import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/contact-list.ts";

const trigger = pollFromListAction({
  key: "new-contact",
  title: "New Contact",
  description: "The run gets each newly created Bitrix24 contact.",
  action,
  input: (params) => ({ ...params, order: { DATE_CREATE: "DESC" }, start: 0 }),
  items: (result) => (result as { results?: unknown[] }).results ?? [],
  idOf: (item) =>
    String(
      (item as { ID?: string | number; id?: string | number }).ID ??
        (item as { id?: string | number }).id,
    ),
  params: action.params,
  output: [{ key: "ID", type: "string", label: "Contact ID" }],
  sample: { ID: "1", NAME: "New contact" },
  maxPages: 1,
});

export default trigger;

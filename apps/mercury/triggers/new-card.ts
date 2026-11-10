import type { ActionDefinition } from "@w6w/types";
import { pollFromListAction } from "../../_shared/poll/mod.ts";
import cardList from "../actions/card-list.ts";

/** Newest-first via the documented `order=desc` query parameter (https://docs.mercury.com/reference/listtransactions). */
export default pollFromListAction({
  key: "new-card",
  title: "New Card",
  description: "The run gets each newly issued card: id, status and cardholder.",
  action: cardList as ActionDefinition,
  input: () => ({ limit: 100, order: "desc" }),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [
    { key: "id", type: "string", label: "Card ID" },
    { key: "status", type: "string", label: "Status" },
    { key: "cardholderName", type: "string", label: "Cardholder" },
  ],
  sample: { id: "card-1", status: "active", cardholderName: "Dana Rivera" },
  maxPages: 1,
});

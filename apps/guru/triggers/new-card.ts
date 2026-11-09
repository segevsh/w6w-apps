import { pollFromListAction } from "../../_shared/poll/mod.ts";
import cardSearch from "../actions/card-search.ts";

export default pollFromListAction({
  key: "new-card",
  title: "New Card",
  description: "Fires when a new Guru knowledge card is created.",
  action: cardSearch,
  input: () => ({ maxResults: 50, sortField: "dateCreated", sortOrder: "DESC" }),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => String((item as { id: unknown }).id),
  output: [{ key: "id", type: "string", label: "Card ID" }],
  sample: { id: "card_123" },
});

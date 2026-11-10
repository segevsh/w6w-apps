import { pollFromListAction } from "../../_shared/poll/mod.ts";
import listCustomerClients from "../actions/list-customer-clients.ts";

export default pollFromListAction({
  key: "new-customer-clients",
  title: "New Customer Client",
  description: "The run gets each newly visible customer client.",
  action: listCustomerClients,
  input: () => ({ limit: 100 }),
  items: (result) => (result as { results?: unknown[] }).results ?? [],
  idOf: (item) =>
    String(
      (item as { customerClient?: { id?: unknown }; id?: unknown }).customerClient?.id ??
        (item as { id?: unknown }).id ?? "",
    ),
  output: [{ key: "customerClient", type: "object", label: "Customer client" }],
  sample: { customerClient: { id: "123" } },
  maxPages: 1,
});

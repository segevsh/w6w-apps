import { pollFromListAction } from "../../_shared/poll/mod.ts";
import type { ActionDefinition } from "@w6w/types";
import mandateList from "../actions/mandate-list.ts";

export default pollFromListAction({
  key: "new-mandate",
  title: "New Mandate",
  description: "The run gets each newly created mandate for the selected Mollie customer.",
  action: mandateList as unknown as ActionDefinition,
  input: (params) => ({ ...params, limit: 100, sort: "desc" }),
  params: (mandateList.params ?? []).filter((param) => param.key === "customerId"),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "string", label: "Mandate ID" }],
  sample: { id: "mdt_new", status: "valid", method: "directdebit" },
  maxPages: 1,
});

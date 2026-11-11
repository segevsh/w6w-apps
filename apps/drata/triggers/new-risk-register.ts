import { pollFromListAction } from "../../_shared/poll/mod.ts";
import riskRegisterList from "../actions/risk-register-list.ts";

export default pollFromListAction({
  key: "new-risk-register",
  title: "New Risk Register",
  description: "The run gets each new risk register.",
  action: riskRegisterList,
  input: () => ({ size: 100, sort: "createdAt", sortDir: "DESC" }),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "number", label: "Risk Register ID" }],
  sample: { id: 1 },
  maxPages: 1,
});

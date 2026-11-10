import { pollFromListAction } from "../../_shared/poll/mod.ts";
import personList from "../actions/person-list.ts";

export default pollFromListAction({
  key: "new-person",
  title: "New Person",
  description: "Polls the newest Salesloft people from person-list.",
  action: personList,
  input: (params) => ({
    ...params,
    sortBy: "created_at",
    sortDirection: "DESC",
    page: 1,
    perPage: 100,
  }),
  items: (result) => (result as { data?: unknown[] }).data ?? [],
  idOf: (item) => String((item as { id: string | number }).id),
  params: personList.params,
  output: [{ key: "id", type: "number", label: "Person ID" }],
  sample: { id: 123, display_name: "Ada Lovelace" },
  maxPages: 1,
});

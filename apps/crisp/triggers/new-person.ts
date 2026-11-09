import type { ActionDefinition } from "@w6w/types";
import { pollFromListAction } from "../../_shared/poll/mod.ts";
import listPeople from "../actions/list-people.ts";

export default pollFromListAction<Parameters<NonNullable<typeof listPeople.execute>>[0]>({
  key: "new-person",
  title: "New Person",
  description: "Emit newly created Crisp people profiles.",
  action: listPeople as unknown as ActionDefinition,
  params: listPeople.params,
  input: (params) => ({
    ...params,
    pageNumber: 1,
    perPage: 50,
    sortField: "created_at",
    sortOrder: "desc",
  }),
  items: (result) => Array.isArray(result) ? result : [],
  idOf: (item) => String((item as { people_id: unknown }).people_id),
  output: [{ key: "people_id", type: "string", label: "People ID" }],
  sample: { people_id: "person_1" },
});

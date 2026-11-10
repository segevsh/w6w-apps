import { pollFromListAction } from "../../_shared/poll/mod.ts";
import type { ActionDefinition } from "@w6w/types";
import businessUnitReviewsList from "../actions/business-unit-reviews-list.ts";

export default pollFromListAction({
  key: "new-review",
  title: "New Review",
  description: "Poll newest Business Unit reviews through the existing list action.",
  action: businessUnitReviewsList as unknown as ActionDefinition,
  input: (params: { businessUnitId?: string }) => ({
    businessUnitId: params.businessUnitId,
    page: 1,
    perPage: 100,
    orderBy: "createdat.desc",
  }),
  params: [businessUnitReviewsList.params![0]],
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "string", label: "Review ID" }],
  sample: { id: "sample-review", stars: 5 },
  maxPages: 1,
});

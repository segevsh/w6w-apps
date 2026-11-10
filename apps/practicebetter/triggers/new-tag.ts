import { pollFromListAction } from "../../_shared/poll/mod.ts";
import type { ActionDefinition } from "@w6w/types";
import action from "../actions/list-tags.ts";

/** `GET /tags`: "Returns a list of tags in descending order based on date created." (https://api-docs.practicebetter.io/swagger.json, verified 2026-11-10). */
export default pollFromListAction({
  key: "new-tag",
  title: "New Tag",
  description: "The run gets each newly created tag.",
  action: action as unknown as ActionDefinition,
  input: () => ({ limit: 100 }),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [
    {
      "key": "id",
      "type": "string",
      "label": "Tag ID",
    },
    {
      "key": "name",
      "type": "string",
      "label": "Tag name",
    },
  ],
  sample: {
    "id": "tag-1",
    "name": "Nutrition",
  },
  maxPages: 1,
});

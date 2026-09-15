import type { ActionDefinition } from "@w6w/types";
import { BexioClient, listQuery, type SearchCriterion } from "../lib/client.ts";

interface Input {
  field: string;
  value: string;
  criteria?: SearchCriterion["criteria"];
  orderBy?: "id" | "intern_name";
  descending?: boolean;
  limit?: number;
  offset?: number;
}

const articleSearch: ActionDefinition<Input> = {
  key: "article-search",
  type: "search",
  resource: "article",
  title: "Search Articles",
  description: "Search articles by a single field/value/criteria triple.",
  params: [
    {
      key: "field",
      label: "Field",
      type: "string",
      required: true,
      hint: 'e.g. "intern_name", "intern_code".',
    },
    { key: "value", label: "Value", type: "string", required: true },
    {
      key: "criteria",
      label: "Criteria",
      type: "select",
      default: "like",
      options: [
        { value: "=", label: "Equals" },
        { value: "!=", label: "Not equals" },
        { value: "like", label: "Contains (partial match)" },
        { value: "in", label: "In list" },
      ],
    },
    {
      key: "orderBy",
      label: "Sort by",
      type: "select",
      options: [
        { value: "id", label: "ID" },
        { value: "intern_name", label: "Internal name" },
      ],
    },
    { key: "descending", label: "Descending", type: "boolean", default: false },
    { key: "limit", label: "Limit", type: "number", default: 100 },
    { key: "offset", label: "Offset", type: "number", default: 0 },
  ],
  output: [
    { key: "id", type: "number", label: "ID" },
    { key: "intern_name", type: "string", label: "Internal name" },
  ],

  execute(input, ctx) {
    const criteria: SearchCriterion[] = [
      { field: input.field, value: input.value, criteria: input.criteria },
    ];
    return new BexioClient(ctx).search("/2.0/article/search", criteria, listQuery(input));
  },
};

export default articleSearch;

import type { ActionDefinition } from "@w6w/types";
import { FormsiteClient, unset } from "../lib/client.ts";
import { formDir } from "../lib/params.ts";

interface Criterion {
  itemId: string;
  operator: "equals" | "contains" | "begins" | "ends";
  value: string;
}

interface Input {
  formDir: string;
  criteria: Criterion[] | string;
  searchMethod?: string;
  limit?: number;
  page?: number;
  resultsView?: string;
}

const OPERATORS = ["equals", "contains", "begins", "ends"];

/** Accept the criteria as an array or as a JSON string of one, and validate each entry. */
export function parseCriteria(raw: unknown): Criterion[] {
  const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error(
      '`criteria` must be a non-empty array, e.g. [{ "itemId": "100", "operator": "equals", "value": "Yes" }].',
    );
  }
  return parsed.map((c, i) => {
    const { itemId, operator, value } = (c ?? {}) as Partial<Criterion>;
    if (!itemId || !operator || value === undefined || value === null) {
      throw new Error(`criteria[${i}] needs itemId, operator and value.`);
    }
    if (!OPERATORS.includes(operator)) {
      throw new Error(`criteria[${i}].operator must be one of ${OPERATORS.join(", ")}.`);
    }
    return { itemId: String(itemId), operator, value: String(value) };
  });
}

const resultSearch: ActionDefinition<Input> = {
  key: "result-search",
  type: "search",
  resource: "result",
  title: "Search Results",
  description:
    "Find results whose answers match. `contains`, `begins` and `ends` only work on text items; multiple-choice and meta items support `equals` only (search by the choice's position number).",
  params: [
    formDir,
    {
      key: "criteria",
      label: "Criteria",
      type: "json",
      required: true,
      hint: 'Array of { itemId, operator: "equals"|"contains"|"begins"|"ends", value }.',
    },
    {
      key: "searchMethod",
      label: "Combine with",
      type: "select",
      default: "and",
      options: [
        { value: "and", label: "All criteria (and)" },
        { value: "or", label: "Any criterion (or)" },
      ],
    },
    {
      key: "resultsView",
      label: "Results View ID",
      type: "string",
      advanced: true,
    },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      default: 100,
      row: "page",
      validation: { min: 1, max: 500, integer: true },
    },
    {
      key: "page",
      label: "Page",
      type: "number",
      default: 1,
      row: "page",
      validation: { min: 1, integer: true },
    },
  ],
  output: [
    { key: "results", type: "array", label: "Results" },
    { key: "page", type: "number", label: "Current page" },
    { key: "lastPage", type: "number", label: "Last page" },
  ],

  async execute(input, ctx) {
    const query: Record<string, string | number | undefined> = {
      limit: input.limit,
      page: input.page,
      search_method: unset(input.searchMethod),
      results_view: unset(input.resultsView),
    };
    for (const c of parseCriteria(input.criteria)) {
      query[`search_${c.operator}[${c.itemId}]`] = c.value;
    }
    const { body, pagination } = await new FormsiteClient(ctx).requestPage<
      { results?: unknown[] }
    >(`/forms/${encodeURIComponent(input.formDir)}/results`, { query });
    return {
      results: body.results ?? [],
      page: pagination.page,
      lastPage: pagination.lastPage,
    };
  },
};

export default resultSearch;

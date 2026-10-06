import type { ActionDefinition } from "@w6w/types";
import { HibobClient } from "../lib/client.ts";
import { toStringList } from "../lib/params.ts";

interface Input {
  fields?: unknown;
  ids?: unknown;
  emails?: unknown;
  showInactive?: boolean;
  humanReadable?: string;
}

export const MAX_FIELDS = 400;

/**
 * `POST /v1/people/search` — Bob's bulk employee read. It is a POST because the
 * body selects the fields.
 *
 * Three behaviours worth knowing (all from the reference's "Critical behaviors"):
 *  - **No pagination.** One call returns every matching employee. For a large
 *    company, search `root.id` first, then batch follow-ups with an id filter.
 *  - **Silent omission.** A field the service user may not view, or a field id
 *    that does not exist, is simply absent from a 200 response. Compare what you
 *    asked for with what came back.
 *  - **Filters:** only `root.id` and `root.email` with `equals`. `filters` must be
 *    omitted entirely when empty — `filters: []` is a 400 — which this action does.
 */
const peopleSearch: ActionDefinition<Input> = {
  key: "people-search",
  type: "search",
  resource: "employee",
  title: "Search Employees",
  description:
    "Read employee fields in bulk, optionally filtered by employee id or email. Returns every " +
    "match in one response (Bob has no pagination here); fields the service user cannot view " +
    "are silently omitted.",
  params: [
    {
      key: "fields",
      label: "Fields",
      type: "json",
      hint: 'Field ids in dot notation, e.g. ["root.id", "root.email", "work.department"]. Up to ' +
        `${MAX_FIELDS}. Omit for Bob's default set (root, about, employment and work categories). ` +
        "List ids with the List Employee Fields action.",
    },
    {
      key: "ids",
      label: "Employee IDs",
      type: "json",
      hint: "Only these employees (root.id equals). Array or comma-separated.",
    },
    {
      key: "emails",
      label: "Emails",
      type: "json",
      hint: "Only these employees (root.email equals). Array or comma-separated.",
    },
    {
      key: "showInactive",
      label: "Include terminated / inactive",
      type: "boolean",
      default: false,
      hint: "Include terminated, hired-not-started and on-leave employees. The service user's " +
        "'access data for' audience must also allow them.",
    },
    {
      key: "humanReadable",
      label: "Human-readable values",
      type: "select",
      options: [
        { value: "", label: "Machine values only" },
        { value: "APPEND", label: "Append humanReadable node" },
        { value: "REPLACE", label: "Replace with human-readable values" },
      ],
      hint: "Converts list ids such as site or department ids into names.",
    },
  ],
  output: [
    { key: "employees", type: "array", label: "Matching employees" },
    { key: "count", type: "number", label: "Number of employees returned" },
  ],

  async execute(input, ctx) {
    const fields = toStringList(input.fields);
    if (fields.length > MAX_FIELDS) {
      throw new Error(
        `Bob accepts at most ${MAX_FIELDS} field ids per search, got ${fields.length}`,
      );
    }
    const ids = toStringList(input.ids);
    const emails = toStringList(input.emails);

    const body: Record<string, unknown> = {};
    if (fields.length) body.fields = fields;
    const filters: Array<{ fieldPath: string; operator: string; values: string[] }> = [];
    if (ids.length) filters.push({ fieldPath: "root.id", operator: "equals", values: ids });
    if (emails.length) {
      filters.push({ fieldPath: "root.email", operator: "equals", values: emails });
    }
    if (filters.length) body.filters = filters;
    if (input.showInactive) body.showInactive = true;
    if (input.humanReadable) body.humanReadable = input.humanReadable;

    const client = new HibobClient(ctx);
    const res = await client.post<{ employees?: unknown[] }>("/people/search", body);
    const employees = res?.employees ?? [];
    return { employees, count: employees.length };
  },
};

export default peopleSearch;

import type { ActionDefinition } from "@w6w/types";
import { AutotaskClient, csv, filterOf } from "../lib/client.ts";
import { canonicalEntity, ENTITIES } from "../lib/entities.ts";

/**
 * `POST /{Entity}/query` — the one read that reaches every entity.
 *
 * The filter grammar is Autotask's own and is passed through untouched:
 * `[{"op":"eq","field":"status","value":1}]`, with operators `eq`, `noteq`, `gt`, `gte`, `lt`,
 * `lte`, `beginsWith`, `endsWith`, `contains`, `exist`, `notExist`, `in`, `notIn`, and nesting via
 * `{"op":"or","items":[...]}` / `{"op":"and","items":[...]}`. A user-defined field is addressed
 * with `"udf": true`. The API refuses a query with no filter, so an empty one becomes
 * `id >= 0`.
 *
 * ## Paging
 *
 * At most 500 rows come back per call (`maxRecords`, capped by the vendor at 500). When more
 * remain, `nextPageUrl` is a full URL on the same zone; pass it back as `pageUrl` to read the next
 * page. The action refuses a `pageUrl` that is not an Autotask zone URL, so it cannot be turned
 * into a request to another host.
 */
const action: ActionDefinition = {
  key: "entity-query",
  type: "search",
  resource: "entity",
  title: "Query entities",
  description:
    "Query any Autotask entity (tickets, companies, contacts, time entries, contracts, " +
    "configuration items, ...) with Autotask's own JSON filter. Up to 500 rows per call; pass " +
    "`nextPageUrl` back as `pageUrl` for the next page.",
  params: [
    {
      key: "entity",
      label: "Entity",
      type: "select",
      required: true,
      options: ENTITIES.map((e) => ({ value: e, label: e })),
      hint: "The REST entity name, e.g. Tickets, Companies, Contacts, TimeEntries.",
    },
    {
      key: "filter",
      label: "Filter (JSON)",
      type: "json",
      hint: 'e.g. [{"op":"eq","field":"companyID","value":123}]. Empty returns every row.',
    },
    {
      key: "maxRecords",
      label: "Max records",
      type: "number",
      default: 100,
      validation: { min: 1, max: 500, integer: true },
      hint: "Up to 500 per page (the vendor's ceiling).",
    },
    {
      key: "includeFields",
      label: "Only these fields",
      type: "string",
      hint: "Comma-separated field names to return, e.g. `id,title,status`. Empty returns all.",
    },
    {
      key: "pageUrl",
      label: "Next page URL",
      type: "string",
      hint: "The `nextPageUrl` from a previous call. When set, the other query params are ignored.",
    },
  ],
  output: [
    { key: "items", type: "array", label: "Matching rows" },
    { key: "count", type: "number", label: "Rows in this page" },
    { key: "nextPageUrl", type: "string", label: "URL of the next page, if there is one" },
    { key: "hasMore", type: "boolean", label: "Whether another page exists" },
  ],

  async execute(input, ctx) {
    const i = input as Record<string, unknown>;
    const client = new AutotaskClient(ctx);

    let result;
    if (typeof i.pageUrl === "string" && i.pageUrl.trim()) {
      result = await client.page(i.pageUrl.trim());
    } else {
      const entity = canonicalEntity(i.entity);
      if (!entity) {
        throw new Error(
          `\`entity\` "${String(i.entity ?? "")}" is not a queryable Autotask entity`,
        );
      }
      const max = Number(i.maxRecords ?? 100);
      result = await client.query(entity, {
        filter: filterOf(i.filter),
        maxRecords: Number.isFinite(max) ? Math.min(500, Math.max(1, Math.trunc(max))) : 100,
        ...(csv(i.includeFields) ? { includeFields: csv(i.includeFields) } : {}),
      });
    }

    const nextPageUrl = result.pageDetails.nextPageUrl ?? undefined;
    return {
      items: result.items,
      count: result.items.length,
      nextPageUrl,
      hasMore: !!nextPageUrl,
    };
  },
};

export default action;

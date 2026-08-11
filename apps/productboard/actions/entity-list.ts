import type { ActionDefinition } from "@w6w/types";
import { type ListResult, ProductboardClient, toList } from "../lib/client.ts";
import {
  bracketedFilterParams,
  entityTypeOptions,
  fieldsParam,
  listOutput,
  pageCursorParam,
  sourceFilterParams,
} from "../lib/params.ts";

/**
 * `GET /v2/entities` — the whole product hierarchy through one endpoint.
 *
 * v2's headline change: products, components, features, subfeatures,
 * initiatives, objectives, key results, releases, release groups, companies and
 * users are all this one path, filtered by `type[]`. In v1 each of those was a
 * separate endpoint with a different shape, and several could not be listed at
 * all.
 *
 * Two filter spellings coexist and both are literal:
 *
 *  - **bracketed sub-keys** — `owner[email]`, `status[name]`, `teams[id]`,
 *    `parent[id]`, `metadata[source][system]`. They are query-parameter names
 *    containing brackets, not a nested object to serialize.
 *  - **repeated keys** — `type[]=feature&type[]=subfeature`. One key per value;
 *    a comma-joined list is not what the parameter means.
 */
interface Input {
  types?: string[] | string;
  name?: string;
  ownerId?: string;
  ownerEmail?: string;
  statusId?: string;
  statusName?: string;
  teamsId?: string;
  teamsName?: string;
  parentId?: string;
  archived?: boolean;
  sourceSystem?: string;
  sourceRecordId?: string;
  fields?: string;
  pageCursor?: string;
}

const entityList: ActionDefinition<Input, ListResult> = {
  key: "entity-list",
  type: "search",
  resource: "entity",
  title: "List entities",
  description:
    "List products, components, features, subfeatures, initiatives, objectives, key results, " +
    "releases, release groups, companies and users, with optional filters.",
  params: [
    {
      key: "types",
      label: "Entity types",
      type: "multiselect",
      options: entityTypeOptions,
      hint: "Sent as repeated `type[]` values. Leave empty for every type.",
    },
    { key: "name", label: "Name", type: "string", hint: "Exact name match." },
    ...bracketedFilterParams("owner", "Owner"),
    ...bracketedFilterParams("status", "Status", true),
    ...bracketedFilterParams("teams", "Team", true),
    {
      key: "parentId",
      label: "Parent ID",
      type: "string",
      hint: "Sent as `parent[id]`. Returns the children of one hierarchy entity.",
    },
    {
      key: "archived",
      label: "Archived",
      type: "boolean",
      hint: "Leave empty to return both. Set false for live entities only.",
    },
    ...sourceFilterParams,
    fieldsParam,
    pageCursorParam,
  ],
  output: listOutput,

  execute(input, ctx) {
    return new ProductboardClient(ctx).list("/entities", {
      query: {
        "type[]": toList(input.types),
        name: input.name,
        "owner[id]": input.ownerId,
        "owner[email]": input.ownerEmail,
        "status[id]": input.statusId,
        "status[name]": input.statusName,
        "teams[id]": input.teamsId,
        "teams[name]": input.teamsName,
        "parent[id]": input.parentId,
        archived: input.archived,
        "metadata[source][system]": input.sourceSystem,
        "metadata[source][recordId]": input.sourceRecordId,
        "fields[]": toList(input.fields),
        pageCursor: input.pageCursor,
      },
    });
  },
};

export default entityList;

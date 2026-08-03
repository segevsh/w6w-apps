import type { ActionDefinition } from "@w6w/types";
import { QuickbaseClient } from "../lib/client.ts";

interface Input {
  tableId: string;
  skip?: number;
}

interface FieldRef {
  id?: number;
  label?: string;
  type?: string;
}

interface Relationship {
  id?: number;
  parentTableId?: string;
  childTableId?: string;
  isCrossApp?: boolean;
  foreignKeyField?: FieldRef;
  lookupFields?: FieldRef[];
  summaryFields?: FieldRef[];
}

interface Output {
  relationships?: Relationship[];
  metadata?: { skip?: number; numRelationships?: number; totalRelationships?: number };
}

/**
 * `GET /tables/{tableId}/relationships?skip=…`.
 *
 * Quickbase is a relational platform, and this is how a workflow discovers the
 * shape: which table is the parent, which field is the foreign key, and which
 * lookup and summary fields are derived across the join. Those derived fields
 * matter for writes — `upsert-records` cannot set a lookup or summary field,
 * because its value belongs to the other table.
 *
 * Note the route's inconsistent pluralisation, which is genuinely what the API
 * does: the list is `/relationships`, while create/update/delete are on the
 * singular `/relationship`. Only the list is exposed here — defining a
 * relationship is schema design with enough type-specific structure that a
 * generic JSON param would be a worse interface than Quickbase's own builder.
 *
 * Paginated by `skip`, with `totalRelationships` in the metadata.
 */
const listRelationships: ActionDefinition<Input, Output> = {
  key: "list-relationships",
  type: "read",
  resource: "table",
  title: "List Relationships",
  description:
    "List a table's relationships — parent table, foreign key, and the lookup and summary fields derived across them.",
  params: [
    {
      key: "tableId",
      label: "Table ID",
      type: "string",
      required: true,
      placeholder: "bck7gp3q2",
    },
    { key: "skip", label: "Skip", type: "number", hint: "Relationships to skip — paging cursor." },
  ],
  output: [
    { key: "relationships", type: "array", label: "Relationships" },
    { key: "metadata", type: "object", label: "Pagination metadata" },
  ],

  execute(input, ctx) {
    return new QuickbaseClient(ctx).request<Output>(
      `tables/${encodeURIComponent(input.tableId)}/relationships`,
      { query: { skip: input.skip } },
    );
  },
};

export default listRelationships;

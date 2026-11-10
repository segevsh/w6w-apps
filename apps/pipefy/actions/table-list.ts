import type { ActionDefinition } from "@w6w/types";
import { gqlArgs, gqlLiteral, PipefyClient } from "../lib/client.ts";

interface Input {
  organizationId: string;
  first?: number;
  after?: string;
}

/**
 * `{ organization(id) { tables { edges { node { id name internal_id } } }
 * } }` — Pipefy's own "Find Tables" example. `tables` is a Relay connection: without `first` the
 * server returns one default page (usually 50 rows, never more than the 50-row maximum;
 * https://developers.pipefy.com/reference/limits-and-best-practices, verified 2026-11-10). With
 * `first` and/or `after` (cursor from the previous `endCursor`; pagination-basics, same date)
 * the query adds `(first: N, after: "…")` and `pageInfo { hasNextPage endCursor }`. A plain call
 * keeps the original query byte for byte.
 */
const buildQuery = (organizationId: string, first?: number, after?: string) => {
  const paged = first !== undefined || after !== undefined;
  const args = paged ? `(${gqlArgs({ first, after })})` : "";
  const pageInfo = paged ? " pageInfo { hasNextPage endCursor }" : "";
  return `{ organization(id: ${
    gqlLiteral(organizationId)
  }) { tables${args} { edges { node { id name internal_id } }${pageInfo} } } }`;
};

const tableList: ActionDefinition<Input> = {
  key: "table-list",
  type: "read",
  resource: "table",
  title: "List Database Tables",
  description: "List every Database Table in an organization.",
  params: [
    { key: "organizationId", label: "Organization ID", type: "string", required: true },
    { key: "first", label: "Page size (Pipefy caps a page at 50)", type: "number" },
    { key: "after", label: "Cursor (from a previous page's endCursor)", type: "string" },
  ],
  output: [
    { key: "tables", type: "array", label: "Tables" },
    { key: "endCursor", type: "string", label: "Cursor for the next page (paged calls only)" },
    { key: "hasNextPage", type: "boolean", label: "Another page follows (paged calls only)" },
  ],

  async execute(input, ctx) {
    const data = await new PipefyClient(ctx).send<
      {
        organization: {
          tables: {
            edges: Array<{ node: unknown }>;
            pageInfo?: { hasNextPage?: boolean; endCursor?: string | null };
          };
        } | null;
      }
    >(buildQuery(input.organizationId, input.first, input.after));
    if (!data.organization) throw new Error("Pipefy returned no organization");
    const { edges, pageInfo } = data.organization.tables;
    const tables = edges.map((e) => e.node);
    return pageInfo
      ? {
        tables,
        endCursor: pageInfo.endCursor ?? null,
        hasNextPage: pageInfo.hasNextPage === true,
      }
      : { tables };
  },
};

export default tableList;

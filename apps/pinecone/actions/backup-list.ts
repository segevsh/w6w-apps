import type { ActionDefinition } from "@w6w/types";
import { PineconeClient } from "../lib/client.ts";

/**
 * `GET /backups` — verified against Pinecone's own `db_control` OpenAPI
 * document (`list_project_backups`).
 *
 * Every backup in the project, across all indexes. Each entry carries the
 * `backup_id` that `index-restore` needs, the `source_index_name` it came from,
 * its `record_count` and a `status` — a backup that is not yet `Ready` cannot
 * be restored, and a restore workflow that does not check first fails at the
 * least convenient moment.
 *
 * `record_count` and `size_bytes` are the fields that make a restore decision
 * possible: the difference between yesterday's backup and today's is usually
 * visible there before it is visible anywhere else.
 */
const action: ActionDefinition = {
  key: "backup-list",
  type: "read",
  resource: "backup",
  title: "List backups",
  description:
    "Every backup in the project, with the id a restore needs and the record count that says " +
    "which one to pick. Only a Ready backup can be restored.",
  params: [
    {
      key: "returnAll",
      label: "Return All",
      type: "boolean",
      default: false,
    },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      default: 100,
      showIf: { "==": [{ var: "returnAll" }, false] },
    },
  ],
  output: [
    { key: "data", type: "array", label: "Backups" },
    { key: "pagination", type: "object", label: "Pagination" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const returnAll = p.returnAll === true;
    const want = returnAll ? Infinity : Math.max(1, Number(p.limit ?? 100));
    const client = new PineconeClient(ctx);

    const data: unknown[] = [];
    let token: string | undefined;
    while (data.length < want) {
      const page = await client.request<
        { data?: unknown[]; pagination?: { next?: string } }
      >("/backups", {
        query: {
          limit: Math.min(100, want === Infinity ? 100 : want - data.length),
          paginationToken: token,
        },
      });
      const chunk = page?.data ?? [];
      data.push(...chunk);
      token = page?.pagination?.next;
      if (!token || chunk.length === 0) break;
    }

    return {
      data: Number.isFinite(want) ? data.slice(0, want) : data,
      pagination: token ? { next: token } : {},
    };
  },
};

export default action;

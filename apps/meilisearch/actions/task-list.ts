import type { ActionDefinition } from "@w6w/types";
import { csv, MeilisearchClient } from "../lib/client.ts";
import { LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /tasks` — verified against Meilisearch's OpenAPI document
 * (`get_tasks`).
 *
 * **This endpoint pages differently from the rest of the API.** `/indexes`,
 * `/keys` and the document listing answer `{results, offset, limit, total}` and
 * page by `offset`; `/tasks` answers `{results, total, limit, from, next}` and
 * pages by a **cursor**, where `next` feeds the following request's `from`.
 * Walking it with `offset` re-reads the first page forever, because `offset` is
 * not a parameter here and is ignored rather than rejected — so the two walks
 * are separate methods on the client.
 *
 * Filtering by `statuses: failed` is the useful shape: it is how a workflow
 * finds writes that reported success and then did not work.
 */
const action: ActionDefinition = {
  key: "task-list",
  type: "read",
  resource: "task",
  title: "List tasks",
  description: "List recent tasks, optionally only the failed ones.",
  params: [
    {
      key: "statuses",
      label: "Statuses",
      type: "string",
      default: "",
      placeholder: "failed, canceled",
      hint: "Comma-separated: enqueued, processing, succeeded, failed, canceled.",
    },
    {
      key: "types",
      label: "Types",
      type: "string",
      default: "",
      placeholder: "documentAdditionOrUpdate",
      hint: "Comma-separated task types.",
    },
    {
      key: "indexUids",
      label: "Indexes",
      type: "string",
      default: "",
      hint: "Comma-separated index uids to narrow to.",
    },
    ...LIST_PARAMS,
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);

    ctx.log("info", "listing Meilisearch tasks", { returnAll, limit });

    // The cursor walk, not the offset walk — see the note above.
    return await new MeilisearchClient(ctx).requestAllFrom(
      "/tasks",
      {
        query: {
          statuses: csv(p.statuses),
          types: csv(p.types),
          indexUids: csv(p.indexUids),
        },
      },
      returnAll ? Infinity : limit,
    );
  },
};

export default action;

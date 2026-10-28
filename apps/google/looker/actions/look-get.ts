import type { ActionDefinition } from "@w6w/types";
import { LookerClient } from "../lib/client.ts";

/**
 * `GET /api/4.0/looks/{id}` — a Look's definition, without running it.
 *
 * ## Read this before depending on a Look in a workflow
 *
 * `look-run` gives rows; this gives the query behind them — the model, the
 * Explore, the fields and the filters. A workflow reading `rows[0].total` is
 * depending on a field list somebody else can change, and this is the only way
 * to see what that list currently is.
 *
 * ## `public` is a URL that serves this data with no login
 *
 * `public_url` works for anybody who has it. That is deliberate and it is also
 * business data on an unauthenticated address, so it is reported plainly.
 *
 * ## `deleted` is soft, and a deleted Look still answers here
 *
 * Unusually for an API, the record survives with `deleted: true` and a
 * `deleted_at`. Running a deleted Look fails, but fetching one does not — so a
 * workflow checking "does this Look exist" by fetching it gets a yes for
 * something that has been in the bin for a year.
 */
const action: ActionDefinition = {
  key: "look-get",
  type: "read",
  resource: "look",
  title: "Get a Look",
  description:
    "A Look's definition without running it — the model, Explore, fields and filters a workflow " +
    "is really depending on. Note a SOFT-DELETED Look still answers here, so fetching one is not " +
    "a test of whether it exists.",
  params: [
    {
      key: "lookId",
      label: "Look ID",
      type: "string",
      required: true,
      default: "",
    },
  ],
  output: [
    { key: "look", type: "object", label: "The Look" },
    { key: "title", type: "string", label: "What it is called" },
    { key: "model", type: "string", label: "The model it queries" },
    { key: "explore", type: "string", label: "The Explore — the API calls this `view`" },
    { key: "fields", type: "array", label: "The fields it selects" },
    { key: "filters", type: "object", label: "The filters it applies" },
    { key: "limit", type: "string", label: "Its own row limit — `-1` means unlimited" },
    { key: "unlimited", type: "boolean", label: "True when the Look has no row ceiling" },
    { key: "isPublic", type: "boolean", label: "Whether its URL needs no login" },
    { key: "deleted", type: "boolean", label: "Soft-deleted, and still returned here" },
    { key: "updatedAt", type: "string", label: "When the definition last changed" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const lookId = String(p.lookId ?? "").trim();
    if (!lookId) throw new Error("`lookId` is required");

    const look = await new LookerClient(ctx).request<{
      title?: string;
      public?: boolean;
      public_url?: string;
      deleted?: boolean;
      updated_at?: string;
      query?: {
        model?: string;
        view?: string;
        fields?: string[];
        filters?: Record<string, unknown>;
        limit?: string;
      };
    }>(`/looks/${encodeURIComponent(lookId)}`);

    // Looker's own documentation: -1 means unlimited.
    const limit = look?.query?.limit;
    const unlimited = limit === "-1" || limit === undefined || limit === null || limit === "";

    if (look?.deleted) {
      ctx.log(
        "warn",
        "this Look is soft-deleted — it still answers a fetch, and running it will not work",
        { lookId },
      );
    }
    if (unlimited) {
      ctx.log(
        "info",
        "this Look has no row limit of its own, so running it unbounded scans the whole Explore " +
          "— `look-run` caps it",
        { lookId },
      );
    }

    return {
      look,
      title: look?.title,
      model: look?.query?.model,
      // Looker's spec documents this field as the Explore name.
      explore: look?.query?.view,
      fields: look?.query?.fields ?? [],
      filters: look?.query?.filters ?? {},
      limit,
      unlimited,
      isPublic: look?.public === true,
      deleted: look?.deleted === true,
      updatedAt: look?.updated_at,
    };
  },
};

export default action;

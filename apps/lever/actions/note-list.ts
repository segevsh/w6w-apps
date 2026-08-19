import type { ActionDefinition } from "@w6w/types";
import { assertUuid, LeverClient, query } from "../lib/client.ts";

/**
 * `GET /v1/opportunities/{id}/notes` — what has been written about a
 * candidate.
 *
 * ## This is the record a person can ask to see
 *
 * Notes are personal data about an identified individual. A data-subject
 * request covers them, which makes this the action that answers it — and a
 * good reason for an automated note to be a fact with a reference rather than
 * a judgement.
 *
 * ## Deleted notes are still returned, marked
 *
 * A note with `deletedAt` set has been removed in the interface and remains in
 * the API response. Counting notes without filtering counts the deleted ones,
 * and showing them to somebody is showing them something a colleague chose to
 * retract.
 *
 * ## Secret notes come back when the key can see them
 *
 * There is no separate endpoint: whether restricted notes appear depends on
 * the API key's access. So an empty result and a filtered one look the same,
 * which is worth knowing before concluding a candidate has no notes.
 */
const action: ActionDefinition = {
  key: "note-list",
  type: "read",
  resource: "note",
  title: "List notes",
  description:
    "What has been written about a candidate — the record a data-subject request covers. " +
    "DELETED notes are still returned with a timestamp, and restricted notes appear only if the " +
    "key can see them, so an empty result and a filtered one look identical.",
  params: [
    { key: "opportunityId", label: "Opportunity ID", type: "string", required: true, default: "" },
    {
      key: "includeDeleted",
      label: "Include deleted notes",
      type: "boolean",
      default: false,
      hint: "A deleted note is one somebody chose to retract.",
    },
    { key: "limit", label: "Limit", type: "number", default: 100 },
  ],
  output: [
    { key: "notes", type: "array", label: "The notes" },
    { key: "count", type: "number", label: "How many, after filtering" },
    { key: "deletedCount", type: "number", label: "Retracted, and still returned by the API" },
    { key: "secretCount", type: "number", label: "Restricted notes this key can see" },
    { key: "authors", type: "array", label: "Which users have written here" },
    { key: "latestAt", type: "number", label: "When the most recent note was written" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const opportunityId = assertUuid(p.opportunityId, "opportunityId");

    const page = await new LeverClient(ctx).list<{
      id?: string;
      user?: string;
      secret?: boolean;
      createdAt?: number;
      deletedAt?: number | null;
    }>(`/opportunities/${encodeURIComponent(opportunityId)}/notes`, {
      query: query({ limit: Math.max(1, Math.min(100, Number(p.limit ?? 100))) }),
    });

    const all = page.data;
    const deleted = all.filter((note) => note?.deletedAt);
    const notes = p.includeDeleted === true ? all : all.filter((note) => !note?.deletedAt);

    // Counts and authors. The notes are what people wrote about a person.
    ctx.log("info", "read Lever notes", { opportunityId, count: notes.length });

    return {
      notes,
      count: notes.length,
      deletedCount: deleted.length,
      secretCount: notes.filter((note) => note?.secret === true).length,
      authors: [...new Set(notes.map((note) => note?.user).filter(Boolean) as string[])],
      latestAt: notes.reduce(
        (latest, note) => Math.max(latest, Number(note?.createdAt ?? 0)),
        0,
      ) || undefined,
    };
  },
};

export default action;

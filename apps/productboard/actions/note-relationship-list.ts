import type { ActionDefinition } from "@w6w/types";
import { encodeId, type ListResult, ProductboardClient } from "../lib/client.ts";
import {
  listOutput,
  noteIdParam,
  noteLinkTargetTypeOptions,
  noteRelationshipTypeOptions,
  pageCursorParam,
} from "../lib/params.ts";

/**
 * `GET /v2/notes/{id}/relationships` — who this feedback came from, and what it
 * is about.
 *
 * Two relationship types, and they answer different questions:
 *
 *  - **`customer`** — the user or company the feedback came from.
 *  - **`link`** — the feature, subfeature, product or component it is about.
 *    This is what Productboard calls an *insight*.
 *
 * This is also the one list endpoint in the whole v2 surface that accepts a
 * `limit` alongside `pageCursor`. Nothing else does — there is no `limit` and no
 * `offset` anywhere else in v2 — so the parameter is offered here and nowhere
 * else rather than being faked into a shared helper.
 */
interface Input {
  noteId: string;
  type?: string;
  targetType?: string;
  limit?: number;
  pageCursor?: string;
}

const noteRelationshipList: ActionDefinition<Input, ListResult> = {
  key: "note-relationship-list",
  type: "search",
  resource: "note",
  title: "List note relationships",
  description:
    "List the customer a note came from and the product entities it is linked to (its insights).",
  params: [
    noteIdParam,
    {
      key: "type",
      label: "Relationship type",
      type: "select",
      options: noteRelationshipTypeOptions,
      hint: "Leave empty for both.",
    },
    {
      key: "targetType",
      label: "Target type",
      type: "select",
      options: [
        { value: "user", label: "User (customer)" },
        { value: "company", label: "Company (customer)" },
        ...noteLinkTargetTypeOptions,
      ],
      hint: "Sent as `target[type]`.",
    },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      validation: { integer: true, min: 1 },
      hint:
        "Page size. This is the ONLY endpoint in API v2 that accepts one — everywhere else the " +
        "API chooses the page size and hands back a cursor.",
    },
    pageCursorParam,
  ],
  output: listOutput,

  execute(input, ctx) {
    return new ProductboardClient(ctx).list(
      `/notes/${encodeId(input.noteId)}/relationships`,
      {
        query: {
          type: input.type,
          "target[type]": input.targetType,
          limit: input.limit,
          pageCursor: input.pageCursor,
        },
      },
    );
  },
};

export default noteRelationshipList;

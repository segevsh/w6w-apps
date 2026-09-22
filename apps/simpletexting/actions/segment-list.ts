import type { ActionDefinition } from "@w6w/types";
import { SimpleTextingClient } from "../lib/client.ts";
import { paginationParams } from "../lib/params.ts";

/**
 * `GET /api/contact-segments` — "Get all Segments".
 *
 * A page of `{segmentId, name, created, updated}`. Read-only in this build:
 * the document exposes no create, update or delete for segments, so they are
 * made in the SimpleTexting dashboard and this app only names them.
 *
 * Both a campaign's `segmentIds` and its `listIds` accept a name or an ID, so
 * this action's purpose is to answer "which segments exist, and what are they
 * called?" before a campaign is sent — the vendor's own campaign example
 * addresses a segment by ID and a list by name in the same request.
 */
interface Input {
  page?: number;
  size?: number;
}

const segmentList: ActionDefinition<Input> = {
  key: "segment-list",
  type: "search",
  resource: "segment",
  title: "List Segments",
  description: "List the account's contact segments.",
  params: paginationParams(),
  output: [
    { key: "content", type: "array", label: "Segments ({segmentId, name, created, updated})" },
    { key: "totalPages", type: "number", label: "Total pages" },
    { key: "totalElements", type: "number", label: "Total elements" },
  ],

  execute(input, ctx) {
    return new SimpleTextingClient(ctx).page("/api/contact-segments", {
      query: { page: input.page, size: input.size },
    });
  },
};

export default segmentList;

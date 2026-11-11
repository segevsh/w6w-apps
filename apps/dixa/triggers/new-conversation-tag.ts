import type { Param } from "@w6w/types";
import { idOf, snapshotTrigger } from "../lib/triggers.ts";
import conversationTagList from "../actions/conversation-tag-list.ts";
import { conversationIdParam } from "../lib/params.ts";

/**
 * Per-parent bounded collection (brief 9.1 c): `GET /v1/conversations/{conversationId}/tags`
 * returns the tags on one conversation in a single response
 * (https://docs.dixa.io/openapi/dixa-api/v1/ , verified 2026-11-10). A tag removed and added
 * back is announced once, as the snapshot keeps the ids it has seen.
 */
export default snapshotTrigger<{ conversationId: number | string }>({
  key: "new-conversation-tag",
  title: "New Conversation Tag",
  description: "The run gets each tag newly put on one Dixa conversation.",
  params: [conversationIdParam as Param],
  output: [
    { key: "id", type: "string", label: "Tag ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "color", type: "string", label: "Color" },
    { key: "state", type: "string", label: "State" },
  ],
  sample: {
    id: "5c4d3e2f-1a0b-4c9d-8e7f-6a5b4c3d2e1f",
    name: "refund",
    color: "#e5484d",
    state: "Active",
  },
  fetchRows: async (params, ctx) => {
    const out = await conversationTagList.execute(
      { conversationId: params.conversationId },
      ctx,
    ) as {
      data?: unknown[];
    };
    return out.data ?? [];
  },
  idOf,
});

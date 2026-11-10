import type { Param } from "@w6w/types";
import { collectPageKeys, snapshotTrigger } from "../lib/triggers.ts";
import conversationListByEndUser from "../actions/conversation-list-by-end-user.ts";

/**
 * Per-parent bounded collection (brief 9.1 c): `GET /v1/endusers/{userId}/conversations` has no
 * documented order or filter, only `pageLimit` and the `pageKey` cursor, so every page is read
 * (at most 20 of 100) and compared (https://docs.dixa.io/openapi/dixa-api/v1/ , verified
 * 2026-11-10). The kit refuses more than 5000 rows.
 */
export default snapshotTrigger<{ userId: string }>({
  key: "new-end-user-conversation",
  title: "New End User Conversation",
  description: "The run gets each conversation newly opened by one Dixa end user.",
  params: [
    {
      key: "userId",
      label: "End user id",
      type: "string",
      required: true,
      hint: "End user UUID.",
    } as Param,
  ],
  output: [
    { key: "id", type: "number", label: "Conversation ID" },
    { key: "channel", type: "string", label: "Channel" },
    { key: "createdAt", type: "string", label: "Created at" },
    { key: "queue", type: "object", label: "Queue" },
  ],
  sample: {
    id: 4217,
    channel: "Email",
    createdAt: "2026-11-09T09:55:00Z",
    queue: { id: "3f1b8c2d-6a4e-4d7b-9c05-1e2f3a4b5c6d" },
  },
  fetchRows: (params, ctx) =>
    collectPageKeys(
      (pageKey) =>
        conversationListByEndUser.execute({
          userId: params.userId,
          pageLimit: 100,
          ...(pageKey ? { pageKey } : {}),
        }, ctx) as Promise<{ data?: unknown[]; nextPageKey?: string }>,
      "end-user conversation list",
    ),
  idOf: (row) => {
    const c = row as { id?: unknown; csid?: unknown };
    return c.id ?? c.csid;
  },
});

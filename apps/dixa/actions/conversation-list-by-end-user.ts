import type { ActionDefinition } from "@w6w/types";
import { DixaClient, encodeId } from "../lib/client.ts";
import { pagedGet, pagedOutput, pageParams } from "../lib/params.ts";

interface Input {
  userId: string;
  pageLimit?: number;
  pageKey?: string;
}

const conversationListByEndUser: ActionDefinition<Input> = {
  key: "conversation-list-by-end-user",
  type: "search",
  resource: "conversation",
  title: "List Conversations by End User",
  description:
    "List the conversations an end user has had, newest pages first as Dixa returns them.",
  params: [
    { key: "userId", label: "End user id", type: "string", required: true, hint: "End user UUID." },
    ...pageParams,
  ],
  output: [...pagedOutput],

  execute(input, ctx) {
    return pagedGet(
      new DixaClient(ctx),
      `/endusers/${encodeId(input.userId, "userId")}/conversations`,
      {
        pageLimit: input.pageLimit,
        pageKey: input.pageKey,
      },
    );
  },
};

export default conversationListByEndUser;

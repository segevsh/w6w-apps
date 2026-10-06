import type { ActionDefinition } from "@w6w/types";
import { seg, TwoChatClient } from "../lib/client.ts";

interface Input {
  groupUuid: string;
  pageNumber?: number;
}

const groupMessagesList: ActionDefinition<Input> = {
  key: "group-messages-list",
  type: "read",
  resource: "group",
  title: "List Group Messages",
  description: "List the messages of a WhatsApp group, newest first, 50 per page (GET " +
    "/whatsapp/groups/messages/{group-uuid}).",
  params: [
    {
      key: "groupUuid",
      label: "Group UUID",
      type: "string",
      required: true,
      hint: "Starts with WAG. From List Groups.",
    },
    {
      key: "pageNumber",
      label: "Page number",
      type: "number",
      hint: "Zero-based page index. 2Chat's first page is 0.",
    },
  ],
  output: [
    { key: "messages", type: "array", label: "Messages with the sending `participant`" },
  ],

  execute(input, ctx) {
    const client = new TwoChatClient(ctx);
    return client.get(`/whatsapp/groups/messages/${seg(input.groupUuid)}`, {
      page_number: input.pageNumber ?? 0,
    });
  },
};

export default groupMessagesList;

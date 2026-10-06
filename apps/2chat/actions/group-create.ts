import type { ActionDefinition } from "@w6w/types";
import { compact, toList, TwoChatClient } from "../lib/client.ts";

interface Input {
  fromNumber: string;
  name: string;
  description?: string;
  participants: string;
}

const groupCreate: ActionDefinition<Input> = {
  key: "group-create",
  type: "perform",
  idempotent: false,
  resource: "group",
  title: "Create WhatsApp Group",
  description: "Create a WhatsApp group from a connected number with up to 10 participants (POST " +
    "/whatsapp/group/create). WhatsApp soft-limits group creation (about 30 a day) and shadow-bans " +
    "numbers that create many. Not idempotent. Check `unaccepted_numbers` in the result.",
  params: [
    {
      key: "fromNumber",
      label: "From number",
      type: "string",
      required: true,
    },
    {
      key: "name",
      label: "Group name",
      type: "string",
      required: true,
    },
    {
      key: "description",
      label: "Description",
      type: "string",
    },
    {
      key: "participants",
      label: "Participants",
      type: "text",
      required: true,
      hint:
        "International-format numbers, comma or newline separated. At most 10; add more with Update Group Participants.",
    },
  ],
  output: [
    {
      key: "group",
      type: "object",
      label: "name, wa_group_id, uuid, accepted_numbers, unaccepted_numbers",
    },
  ],

  execute(input, ctx) {
    const client = new TwoChatClient(ctx);
    const participants = toList(input.participants);
    if (participants.length === 0) throw new Error("group-create needs at least one participant");
    if (participants.length > 10) {
      throw new Error("a group is created with at most 10 participants; add the rest afterwards");
    }
    return client.post("/whatsapp/group/create", {
      from_number: input.fromNumber,
      group: compact({ name: input.name, description: input.description, participants }),
    });
  },
};

export default groupCreate;

import type { ActionDefinition } from "@w6w/types";
import { seg, toList, TwoChatClient } from "../lib/client.ts";

interface Input {
  groupUuid: string;
  fromNumber: string;
  operation: string;
  participants: string;
}

const groupParticipantsUpdate: ActionDefinition<Input> = {
  key: "group-participants-update",
  type: "perform",
  idempotent: true,
  resource: "group",
  title: "Update Group Participants",
  description:
    "Add, remove, promote to admin or demote participants of a WhatsApp group, up to 10 per call " +
    "(POST /whatsapp/group/{group-uuid}/{add|remove|promote|demote}-participant). Read the per-number " +
    "result, including `unaccepted_numbers`.",
  params: [
    {
      key: "groupUuid",
      label: "Group UUID",
      type: "string",
      required: true,
    },
    {
      key: "fromNumber",
      label: "From number",
      type: "string",
      required: true,
      hint: "The connected number acting on the group; it needs admin rights for most operations.",
    },
    {
      key: "operation",
      label: "Operation",
      type: "select",
      required: true,
      options: [{ "value": "add", "label": "Add" }, { "value": "remove", "label": "Remove" }, {
        "value": "promote",
        "label": "Promote",
      }, { "value": "demote", "label": "Demote" }],
    },
    {
      key: "participants",
      label: "Participants",
      type: "text",
      required: true,
      hint: "International-format numbers, comma or newline separated. At most 10.",
    },
  ],
  output: [
    { key: "participants", type: "object", label: "Per-number outcome" },
  ],

  execute(input, ctx) {
    const client = new TwoChatClient(ctx);
    if (!["add", "remove", "promote", "demote"].includes(input.operation)) {
      throw new Error("operation must be add, remove, promote or demote");
    }
    const participants = toList(input.participants);
    if (participants.length === 0) throw new Error("participants must not be empty");
    if (participants.length > 10) throw new Error("at most 10 participants per call");
    return client.post(`/whatsapp/group/${seg(input.groupUuid)}/${input.operation}-participant`, {
      from_number: input.fromNumber,
      participants,
    });
  },
};

export default groupParticipantsUpdate;

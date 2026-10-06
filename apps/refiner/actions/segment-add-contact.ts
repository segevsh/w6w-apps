import type { ActionDefinition } from "@w6w/types";
import { CONTACT_REF_PARAMS, contactRef, RefinerClient } from "../lib/client.ts";

interface Input {
  id?: string;
  email?: string;
  segmentUuid: string;
}

const segmentAddContact: ActionDefinition<Input> = {
  key: "segment-add-contact",
  type: "perform",
  resource: "segment",
  title: "Add User to Segment",
  description: "Add a user to a manual segment. A user that does not exist yet is created.",
  idempotent: true,
  params: [
    ...CONTACT_REF_PARAMS.filter((p) => p.key !== "uuid"),
    {
      key: "segmentUuid",
      label: "Segment UUID",
      type: "string",
      required: true,
      hint: "Must be a manual segment (`is_manual`) — see List Segments.",
    },
  ],
  output: [
    { key: "message", type: "string", label: "Vendor confirmation" },
    { key: "contact_uuid", type: "string", label: "Contact UUID" },
    { key: "segment_uuid", type: "string", label: "Segment UUID" },
  ],

  async execute(input, ctx) {
    const payload = { ...contactRef(input), segment_uuid: input.segmentUuid };
    return await new RefinerClient(ctx).json("/sync-segment", { method: "POST", body: payload });
  },
};

export default segmentAddContact;

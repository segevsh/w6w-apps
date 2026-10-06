import type { ActionDefinition } from "@w6w/types";
import { TalentLmsClient } from "../lib/client.ts";

interface Input {
  name: string;
  description?: string;
  key?: string;
  price?: string;
  creatorId?: number;
  maxRedemptions?: number;
}

const groupCreate: ActionDefinition<Input> = {
  key: "group-create",
  type: "perform",
  resource: "group",
  title: "Create Group",
  description: "Create a group.",
  // Mints something new on every call, so a retry is not safe.
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    { key: "description", label: "Description", type: "text" },
    { key: "key", label: "Group key", type: "string", hint: "The code users enter to join." },
    { key: "price", label: "Price", type: "string" },
    { key: "creatorId", label: "Creator user ID", type: "number", advanced: true },
    { key: "maxRedemptions", label: "Max redemptions", type: "number", advanced: true },
  ],

  execute(input, ctx) {
    return new TalentLmsClient(ctx).post("creategroup", {
      name: input.name,
      description: input.description,
      key: input.key,
      price: input.price,
      creator_id: input.creatorId,
      max_redemptions: input.maxRedemptions,
    });
  },
};

export default groupCreate;

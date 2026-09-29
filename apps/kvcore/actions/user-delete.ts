import type { ActionDefinition } from "@w6w/types";
import { KvCoreClient } from "../lib/client.ts";

interface Input {
  user_id: string;
  assign_to_agent_id?: string;
  assign_to_entity_id?: string;
}

/**
 * `DELETE /v2/public/user/{user_id}` — remove a user from the account.
 *
 * If neither reassignment field is given, the vendor round-robins the
 * deleted user's leads to all remaining agents. Either way, reassigned leads
 * get a `from{DeletedUsersName}` hashtag, per the vendor's own docs.
 */
const userDelete: ActionDefinition<Input> = {
  key: "user-delete",
  type: "perform",
  resource: "user",
  title: "Remove User",
  description:
    "Remove a user from the account. Their leads round-robin to all agents unless you name a " +
    "reassignment target below.",
  idempotent: true,
  params: [
    { key: "user_id", label: "User ID", type: "string", required: true },
    {
      key: "assign_to_agent_id",
      label: "Reassign leads to agent",
      type: "string",
    },
    {
      key: "assign_to_entity_id",
      label: "Reassign leads to entity",
      type: "string",
      hint: "The entity's own lead-matching rules decide the new agent.",
    },
  ],
  output: [{ key: "message", type: "string", label: "Confirmation message" }],

  async execute(input, ctx) {
    const { user_id, ...body } = input;
    return await new KvCoreClient(ctx).json(`/user/${encodeURIComponent(user_id)}`, {
      method: "DELETE",
      body: Object.keys(body).length > 0 ? body : undefined,
    });
  },
};

export default userDelete;

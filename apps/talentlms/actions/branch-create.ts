import type { ActionDefinition } from "@w6w/types";
import { TalentLmsClient } from "../lib/client.ts";

interface Input {
  name: string;
  description?: string;
  groupId?: number;
  language?: string;
  timezone?: string;
  signupMethod?: string;
  userType?: string;
  usersLimit?: number;
  internalAnnouncement?: string;
  externalAnnouncement?: string;
  creatorId?: number;
}

const branchCreate: ActionDefinition<Input> = {
  key: "branch-create",
  type: "perform",
  resource: "branch",
  title: "Create Branch",
  description: "Create a branch.",
  // Mints something new on every call, so a retry is not safe.
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    { key: "description", label: "Description", type: "text" },
    { key: "groupId", label: "Group ID", type: "number" },
    { key: "language", label: "Language", type: "string", advanced: true },
    { key: "timezone", label: "Time zone", type: "string", advanced: true },
    { key: "signupMethod", label: "Signup method", type: "string", advanced: true },
    { key: "userType", label: "User type", type: "string", advanced: true },
    { key: "usersLimit", label: "Users limit", type: "number", advanced: true },
    { key: "internalAnnouncement", label: "Internal announcement", type: "text", advanced: true },
    { key: "externalAnnouncement", label: "External announcement", type: "text", advanced: true },
    { key: "creatorId", label: "Creator user ID", type: "number", advanced: true },
  ],

  execute(input, ctx) {
    return new TalentLmsClient(ctx).post("createbranch", {
      name: input.name,
      description: input.description,
      group_id: input.groupId,
      language: input.language,
      timezone: input.timezone,
      signup_method: input.signupMethod,
      user_type: input.userType,
      users_limit: input.usersLimit,
      internal_announcement: input.internalAnnouncement,
      external_announcement: input.externalAnnouncement,
      creator_id: input.creatorId,
    });
  },
};

export default branchCreate;

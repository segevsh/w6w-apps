import type { ActionDefinition } from "@w6w/types";
import { compact, ShortcutClient, toStringList } from "../lib/client.ts";

/** `POST /api/v3/epics` — create an Epic. Only `name` is required. */
interface Input {
  name: string;
  description?: string;
  epicStateId?: number;
  deadline?: string;
  plannedStartDate?: string;
  requestedById?: string;
  ownerIds?: string | string[];
  followerIds?: string | string[];
  groupIds?: string | string[];
  externalId?: string;
}

const epicCreate: ActionDefinition<Input> = {
  key: "epic-create",
  type: "perform",
  resource: "epic",
  title: "Create Epic",
  description: "Create a new Epic.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true, validation: { maxLength: 256 } },
    { key: "description", label: "Description", type: "text" },
    {
      key: "epicStateId",
      label: "Epic State ID",
      type: "number",
      validation: { integer: true },
      hint: "From `GET /epic-workflow`. Leave empty to use the workspace default state.",
    },
    { key: "deadline", label: "Deadline", type: "datetime" },
    { key: "plannedStartDate", label: "Planned start date", type: "datetime" },
    { key: "requestedById", label: "Requested by (Member UUID)", type: "string" },
    { key: "ownerIds", label: "Owner Member UUIDs", type: "multiselect" },
    { key: "followerIds", label: "Follower Member UUIDs", type: "multiselect" },
    { key: "groupIds", label: "Group UUIDs", type: "multiselect" },
    { key: "externalId", label: "External ID", type: "string", validation: { maxLength: 128 } },
  ],
  output: [{ key: "data", type: "object", label: "The created Epic" }],

  execute(input, ctx) {
    return new ShortcutClient(ctx).post(
      "/epics",
      compact({
        name: input.name,
        description: input.description,
        epic_state_id: input.epicStateId,
        deadline: input.deadline,
        planned_start_date: input.plannedStartDate,
        requested_by_id: input.requestedById,
        owner_ids: toStringList(input.ownerIds),
        follower_ids: toStringList(input.followerIds),
        group_ids: toStringList(input.groupIds),
        external_id: input.externalId,
      }),
    );
  },
};

export default epicCreate;

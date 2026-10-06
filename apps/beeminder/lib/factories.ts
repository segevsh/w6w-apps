import type { ActionDefinition, Param } from "@w6w/types";
import { BeeminderClient, goalPath, mapGoal } from "./client.ts";

export const USERNAME: Param = {
  key: "username",
  label: "Username",
  type: "string",
  default: "me",
  hint: "Beeminder username. `me` (the default) is the vendor's macro for the token's own user.",
};

export const SLUG: Param = {
  key: "slug",
  label: "Goal slug",
  type: "string",
  required: true,
  hint: "The last part of the goal's URL: beeminder.com/<user>/<slug>.",
};

export const GOAL_OUTPUT = [
  { key: "slug", type: "string", label: "Goal slug" },
  { key: "title", type: "string", label: "Title" },
  { key: "goalType", type: "string", label: "Goal type" },
  { key: "goalUnits", type: "string", label: "Goal units" },
  { key: "goalDate", type: "number", label: "Goal date (unix seconds)" },
  { key: "goalValue", type: "number", label: "Goal value" },
  { key: "rate", type: "number", label: "Rate" },
  { key: "rateUnits", type: "string", label: "Rate units (y, m, w, d, h)" },
  { key: "loseDate", type: "number", label: "Derail time (unix seconds)" },
  { key: "safeDays", type: "number", label: "Safe days" },
  { key: "pledge", type: "number", label: "Pledge (USD)" },
  { key: "limitSummary", type: "string", label: "What you need to do to eke by" },
  { key: "graphUrl", type: "string", label: "Graph image URL" },
  { key: "frozen", type: "boolean", label: "Frozen" },
  { key: "queued", type: "boolean", label: "Graph update queued" },
  { key: "updatedAt", type: "number", label: "Updated at (unix seconds)" },
  { key: "goal", type: "object", label: "Full goal object" },
] satisfies ActionDefinition["output"];

interface GoalInput {
  username?: string;
  slug: string;
}

/** A parameterless `POST /users/u/goals/g/<suffix>.json` that returns the updated goal. */
export function goalPostAction(
  key: string,
  title: string,
  description: string,
  suffix: string,
  idempotent: boolean,
): ActionDefinition<GoalInput> {
  return {
    key,
    type: "perform",
    resource: "goal",
    title,
    description,
    idempotent,
    params: [USERNAME, SLUG],
    output: GOAL_OUTPUT,
    async execute(input, ctx) {
      const { data } = await new BeeminderClient(ctx).request(
        `${goalPath(input.username, input.slug)}/${suffix}.json`,
        { method: "POST" },
      );
      return mapGoal(data);
    },
  };
}

export const DATAPOINT_OUTPUT = [
  { key: "id", type: "string", label: "Datapoint ID" },
  { key: "timestamp", type: "number", label: "Timestamp (unix seconds)" },
  { key: "daystamp", type: "string", label: "Daystamp (yyyymmdd)" },
  { key: "value", type: "number", label: "Value" },
  { key: "comment", type: "string", label: "Comment" },
  { key: "requestId", type: "string", label: "Request ID" },
  { key: "updatedAt", type: "number", label: "Updated at (unix seconds)" },
] satisfies ActionDefinition["output"];

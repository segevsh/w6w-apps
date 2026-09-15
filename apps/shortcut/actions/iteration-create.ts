import type { ActionDefinition } from "@w6w/types";
import { compact, ShortcutClient, toStringList } from "../lib/client.ts";

/**
 * `POST /api/v3/iterations` — create an Iteration.
 *
 * `name`, `startDate` and `endDate` are all required. Unlike every date field
 * elsewhere in this app (`deadline`, `plannedStartDate`, `completedAtOverride`,
 * …), which are full timestamps, an Iteration's `start_date`/`end_date` are
 * plain **dates** — the vendor's own example is `"2019-07-01"`, with no time or
 * zone component.
 */
interface Input {
  name: string;
  startDate: string;
  endDate: string;
  description?: string;
  groupIds?: string | string[];
  followerIds?: string | string[];
}

const iterationCreate: ActionDefinition<Input> = {
  key: "iteration-create",
  type: "perform",
  resource: "iteration",
  title: "Create Iteration",
  description: "Create a new, time-boxed Iteration.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    {
      key: "startDate",
      label: "Start date",
      type: "date",
      required: true,
      placeholder: "2026-09-15",
      hint: "A date, not a date-time.",
    },
    {
      key: "endDate",
      label: "End date",
      type: "date",
      required: true,
      placeholder: "2026-09-29",
      hint: "A date, not a date-time.",
    },
    { key: "description", label: "Description", type: "text" },
    { key: "groupIds", label: "Group UUIDs", type: "multiselect" },
    { key: "followerIds", label: "Follower Member UUIDs", type: "multiselect" },
  ],
  output: [{ key: "data", type: "object", label: "The created Iteration" }],

  execute(input, ctx) {
    return new ShortcutClient(ctx).post(
      "/iterations",
      compact({
        name: input.name,
        start_date: input.startDate,
        end_date: input.endDate,
        description: input.description,
        group_ids: toStringList(input.groupIds),
        follower_ids: toStringList(input.followerIds),
      }),
    );
  },
};

export default iterationCreate;

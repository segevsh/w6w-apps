import type { ActionDefinition } from "@w6w/types";
import {
  OutsetaClient,
  PAGE_OUTPUT,
  PAGE_PARAMS,
  type PageInput,
  pageQuery,
} from "../lib/client.ts";

interface Input extends PageInput {
  activityType?: string;
  entityType?: string;
  entityUid?: string;
}

/** `GET /api/v1/activities` — List the activity feed, optionally for one entity. Limited to the last year unless a date filter is given. */
const listActivities: ActionDefinition<Input> = {
  key: "list-activities",
  type: "search",
  resource: "activity",
  title: "List Activities",
  description:
    "List the activity feed, optionally for one entity. Limited to the last year unless a date filter is given.",
  params: [
    ...PAGE_PARAMS,
    {
      key: "activityType",
      label: "Activity type",
      type: "string",
      hint: "Numeric type, or a bracketed list like `[100,101]`. `10` is Custom.",
    },
    {
      key: "entityType",
      label: "Entity type",
      type: "string",
      hint: "`1` Account, `2` Person, `3` Deal, `4` Case, `5` Invoice.",
    },
    {
      key: "entityUid",
      label: "Entity Uid",
      type: "string",
      hint: "Only activities on this entity.",
    },
  ],
  output: PAGE_OUTPUT,

  execute(input, ctx) {
    return OutsetaClient.fromConnection(ctx).request(`/activities`, {
      method: "GET",
      query: {
        ...pageQuery(input),
        ActivityType: input.activityType,
        EntityType: input.entityType,
        EntityUid: input.entityUid,
      },
    });
  },
};

export default listActivities;

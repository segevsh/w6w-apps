import type { ActionDefinition } from "@w6w/types";
import { compact, CopperClient, PARENT_TYPES } from "../lib/client.ts";

interface Input {
  parentType: string;
  parentId: number;
  details: string;
  activityTypeId?: number;
  activityDate?: number;
  userId?: number;
}

/**
 * `POST /activities` — log an Activity (a note, a call, a meeting) against a
 * record.
 *
 * `parent` and `type` are both `{id, ...}` objects in Copper's body, so this
 * action collects their halves as flat params and assembles them. `parent` is
 * required — an Activity always belongs to something.
 *
 * **`type.category` is always `"user"` here, and that is a real constraint, not
 * a simplification.** Copper: "Only 'User' type Activities can be created or
 * modified using the developer API. 'System' type Activities are read-only."
 * Offering a category selector would offer a value that cannot work.
 *
 * `activityTypeId` defaults to `0`, which is Copper's hard-coded id for Notes:
 * "By default, Copper has three user-entered activity types: Notes, Phone Calls,
 * and Meetings. Notes have a hard-coded ID of 0. Phone Calls and Meetings are
 * assigned IDs when your Copper account is created." So a note works with no
 * lookup, while calls, meetings and custom types need their per-account id from
 * List Activity Types. Note also that a custom type removed from the Settings
 * page is still visible through that API and can still be filtered on, but
 * cannot be used to create new Activities.
 *
 * Not idempotent: a retry logs a second identical Activity.
 */
const createActivity: ActionDefinition<Input> = {
  key: "create-activity",
  type: "perform",
  resource: "activity",
  title: "Create Activity",
  description:
    "Log a note, call or meeting against a Lead, Person, Company, Opportunity, Project or Task. " +
    "Only user-category activities can be created — system activities are read-only.",
  idempotent: false,
  params: [
    {
      key: "parentType",
      label: "Parent type",
      type: "select",
      required: true,
      options: PARENT_TYPES.map((t) => ({ value: t, label: t })),
    },
    { key: "parentId", label: "Parent ID", type: "number", required: true },
    {
      key: "details",
      label: "Details",
      type: "text",
      required: true,
      hint: "The body of the note or the summary of the call/meeting.",
    },
    {
      key: "activityTypeId",
      label: "Activity type ID",
      type: "number",
      default: 0,
      hint:
        "`0` is Copper's hard-coded id for Notes and needs no lookup. Phone Calls, Meetings and " +
        "any custom types get per-account ids — read them from the List Activity Types action. " +
        'The category is always "user": system activities cannot be created through the API.',
    },
    {
      key: "activityDate",
      label: "Activity date",
      type: "number",
      hint: "Unix timestamp in seconds. Copper uses the current time when omitted.",
    },
    {
      key: "userId",
      label: "User ID",
      type: "number",
      hint: "Who performed the activity. Defaults to the API user the key belongs to.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Activity ID" },
    { key: "activity_date", type: "number", label: "Activity date (Unix seconds)" },
  ],

  execute(input, ctx) {
    return new CopperClient(ctx).request("/activities", {
      method: "POST",
      body: compact({
        parent: { id: input.parentId, type: input.parentType },
        type: { category: "user", id: input.activityTypeId ?? 0 },
        details: input.details,
        activity_date: input.activityDate,
        user_id: input.userId,
      }),
    });
  },
};

export default createActivity;

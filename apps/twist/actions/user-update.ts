import type { ActionDefinition } from "@w6w/types";
import { idList, omit, twist } from "../lib/client.ts";

/**
 * `POST /api/v3/users/update`
 *
 * Update the logged-in user's profile. Password changes and away mode are not exposed.
 *
 * The User object carries `token`, "The user's API token". It is deleted here so a
 * workflow never receives (or logs) the live credential.
 */
interface Input {
  name?: string;
  email?: string;
  defaultWorkspace?: number;
  profession?: string;
  contactInfo?: string;
  timezone?: string;
  snoozeUntil?: number;
  snoozeDndStart?: string;
  snoozeDndEnd?: string;
  offDays?: string;
}

const userUpdate: ActionDefinition<Input> = {
  key: "user-update",
  type: "perform",
  resource: "user",
  title: "Update Current User",
  description:
    "Update the logged-in user's profile. Password changes and away mode are not exposed.",
  idempotent: true,
  params: [
    { key: "name", label: "Name", type: "string" },
    { key: "email", label: "Email", type: "string" },
    { key: "defaultWorkspace", label: "Default workspace ID", type: "number" },
    { key: "profession", label: "Profession", type: "string" },
    { key: "contactInfo", label: "Contact info", type: "string" },
    { key: "timezone", label: "Timezone", type: "string" },
    { key: "snoozeUntil", label: "Snooze for (seconds)", type: "number" },
    { key: "snoozeDndStart", label: "Do-not-disturb start", type: "string" },
    { key: "snoozeDndEnd", label: "Do-not-disturb end", type: "string" },
    {
      key: "offDays",
      label: "Off days",
      type: "string",
      hint: "Comma-separated ISO weekdays, 1 = Monday .. 7 = Sunday.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "User ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "email", type: "string", label: "Email" },
  ],

  execute(input, ctx) {
    return twist(ctx, {
      method: "POST",
      path: "/users/update",
      params: {
        "name": input.name,
        "email": input.email,
        "default_workspace": input.defaultWorkspace,
        "profession": input.profession,
        "contact_info": input.contactInfo,
        "timezone": input.timezone,
        "snooze_until": input.snoozeUntil,
        "snooze_dnd_start": input.snoozeDndStart,
        "snooze_dnd_end": input.snoozeDndEnd,
        "off_days": idList(input.offDays),
      },
    }).then((user) => omit(user, ["token"]));
  },
};

export default userUpdate;

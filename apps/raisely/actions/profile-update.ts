import type { ActionDefinition } from "@w6w/types";
import { compact, customFields, pick, RaiselyClient, seg } from "../lib/client.ts";
import { customFieldParams, overwriteParam, privateParam } from "../lib/params.ts";

interface Input {
  path: string;
  campaign?: string;
  private?: boolean;
  partial?: boolean;
  name?: string;
  newPath?: string;
  description?: string;
  goal?: number;
  currency?: string;
  type?: string;
  pronouns?: string;
  photoUrl?: string;
  fundraiserTheme?: string;
  exerciseGoal?: number;
  exerciseGoalTime?: number;
  public?: string | Record<string, unknown>;
  private_fields?: string | Record<string, unknown>;
  overwriteCustomFields?: boolean;
}

const profileUpdate: ActionDefinition<Input> = {
  key: "profile-update",
  type: "perform",
  resource: "profile",
  title: "Update Profile",
  description: "Update a fundraiser profile's name, goal, description, photo or custom fields.",
  idempotent: true,
  params: [
    {
      key: "path",
      label: "Profile",
      type: "string",
      required: true,
      hint: "The uuid or path of the profile.",
    },
    {
      key: "campaign",
      label: "Campaign",
      type: "string",
      hint: "The uuid, path or domain of the campaign to associate with the request.",
    },
    { key: "name", label: "Name", type: "string" },
    {
      key: "newPath",
      label: "New path",
      type: "string",
      hint: "Sets the profile's own `path` (its alternative lookup key).",
    },
    { key: "description", label: "Description", type: "text" },
    {
      key: "goal",
      label: "Goal (cents)",
      type: "number",
      validation: { integer: true, min: 0 },
    },
    { key: "currency", label: "Currency", type: "string", hint: "3 letter currency code." },
    {
      key: "type",
      label: "Type",
      type: "select",
      options: [
        { value: "INDIVIDUAL", label: "Individual" },
        { value: "GROUP", label: "Group" },
        { value: "ORGANISATION", label: "Organisation" },
      ],
    },
    { key: "pronouns", label: "Pronouns", type: "string" },
    { key: "photoUrl", label: "Photo URL", type: "string" },
    { key: "fundraiserTheme", label: "Fundraiser theme", type: "string" },
    {
      key: "exerciseGoal",
      label: "Exercise goal (metres)",
      type: "number",
      validation: { integer: true, min: 0 },
    },
    {
      key: "exerciseGoalTime",
      label: "Exercise goal time (minutes)",
      type: "number",
      validation: { integer: true, min: 0 },
    },
    ...customFieldParams(),
    overwriteParam(),
    {
      key: "partial",
      label: "Partial custom-field update",
      type: "boolean",
      hint: "Merge public/private values instead of overwriting them.",
    },
    privateParam(),
  ],
  output: [
    { key: "uuid", type: "string", label: "Profile uuid" },
    { key: "path", type: "string", label: "Path" },
    { key: "name", type: "string", label: "Name" },
  ],

  async execute(input, ctx) {
    const data = compact({
      ...pick(input, [
        "name",
        "description",
        "goal",
        "currency",
        "type",
        "pronouns",
        "photoUrl",
        "fundraiserTheme",
        "exerciseGoal",
        "exerciseGoalTime",
      ]),
      path: input.newPath,
      ...customFields(input),
    });
    return await new RaiselyClient(ctx).data(`/profiles/${seg(input.path)}`, {
      method: "PATCH",
      query: compact({
        campaign: input.campaign,
        private: input.private,
        partial: input.partial,
      }),
      body: compact({ data, overwriteCustomFields: input.overwriteCustomFields }),
    });
  },
};

export default profileUpdate;

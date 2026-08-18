import type { ActionDefinition } from "@w6w/types";
import { AmplitudeClient, json } from "../lib/client.ts";

/**
 * `POST /groupidentify` — set properties on a *group* rather than a user.
 *
 * ## What a group actually is here
 *
 * A group is Amplitude's account-level dimension: `company: "Acme"`,
 * `workspace: "eng"`. It exists so a B2B product can ask questions about
 * accounts rather than about individuals — "how many workspaces adopted this
 * feature", not "how many people clicked it".
 *
 * ## Group properties are not user properties, and mixing them loses data
 *
 * A user's `user_properties.company_plan` describes what *that user's* company
 * was on at the moment of that event. A group's property describes the company
 * itself, historically, for every user in it. They answer different questions
 * and Amplitude stores them separately — setting one when you meant the other
 * produces charts that look plausible and segment on the wrong thing.
 *
 * ## Groups are a paid feature and fail quietly without it
 *
 * Group analytics is not on every Amplitude plan. On a plan without it, this
 * endpoint accepts the request and the properties simply never appear. That is
 * worth knowing before spending an afternoon on why a group chart is empty.
 *
 * Like `/identify`, this is **form-encoded** rather than JSON.
 */
const action: ActionDefinition = {
  key: "group-identify",
  type: "perform",
  resource: "group",
  title: "Set group properties",
  description:
    "Set properties on an account or workspace rather than a person. Group analytics is a paid " +
    "feature and this accepts the request regardless — the properties just never appear.",
  idempotent: true,
  params: [
    {
      key: "groupType",
      label: "Group Type",
      type: "string",
      required: true,
      default: "",
      placeholder: "company",
      hint: "The dimension — `company`, `workspace`, `team`. Configured in the project settings.",
    },
    {
      key: "groupName",
      label: "Group Name",
      type: "string",
      required: true,
      default: "",
      placeholder: "Acme",
      hint: "The particular account.",
    },
    {
      key: "groupProperties",
      label: "Group Properties",
      type: "json",
      required: true,
      default: "",
      hint: 'e.g. {"plan":"enterprise","seats":40}. These describe the ACCOUNT — a user property ' +
        "of the same name describes what one person saw, which is a different question.",
    },
  ],
  output: [
    { key: "identified", type: "boolean", label: "Accepted" },
    { key: "groupType", type: "string", label: "The dimension" },
    { key: "groupName", type: "string", label: "The account" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const groupType = String(p.groupType ?? "").trim();
    const groupName = String(p.groupName ?? "").trim();
    if (!groupType) throw new Error("`groupType` is required");
    if (!groupName) throw new Error("`groupName` is required");

    const groupProperties = json(p.groupProperties, "groupProperties") as
      | Record<string, unknown>
      | undefined;
    if (!groupProperties || Object.keys(groupProperties).length === 0) {
      throw new Error("`groupProperties` is required — give at least one property to set");
    }

    await new AmplitudeClient(ctx).ingest({
      path: "/groupidentify",
      // Form-encoded, like /identify and unlike everything else.
      form: true,
      body: {
        identification: JSON.stringify([{
          group_type: groupType,
          group_value: groupName,
          group_properties: groupProperties,
        }]),
      },
    });

    ctx.log("info", "set Amplitude group properties", {
      groupType,
      propertyCount: Object.keys(groupProperties).length,
    });

    return { identified: true, groupType, groupName };
  },
};

export default action;

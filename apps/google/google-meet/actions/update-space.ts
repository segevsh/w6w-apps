import type { ActionDefinition } from "@w6w/types";
import { GoogleMeetClient } from "../lib/client.ts";

interface Input {
  name: string;
  updateMask: string;
  accessType?: "OPEN" | "TRUSTED" | "RESTRICTED";
  entryPointAccess?: "ALL" | "CREATOR_APP_ONLY";
  moderation?: "OFF" | "ON";
  moderationRestrictions?: Record<string, unknown>;
  artifactConfig?: Record<string, unknown>;
  attendanceReportGenerationType?: "GENERATE_REPORT" | "DO_NOT_GENERATE";
}

/**
 * `meet.spaces.patch` — PATCH `v2/{+name}`
 * (https://meet.googleapis.com/$discovery/rest?version=v2).
 *
 * Google's `update_mask` is a comma-separated list of field paths; only the
 * fields you name are written, so the same flat `config` fields collected here
 * are paired with the mask the caller supplies (e.g.
 * `config.accessType,config.moderation`). `name` is immutable — it identifies
 * the space, not a value to change.
 */
const updateSpace: ActionDefinition<Input> = {
  key: "update-space",
  type: "perform",
  resource: "space",
  title: "Update Space",
  description:
    "Update a space's configuration. `updateMask` selects which fields are written (comma-separated paths, e.g. `config.accessType`).",
  idempotent: true,
  params: [
    {
      key: "name",
      label: "Space name",
      type: "string",
      required: true,
      hint: "`spaces/{space}` — the immutable resource name.",
    },
    {
      key: "updateMask",
      label: "Update mask",
      type: "string",
      required: true,
      hint:
        "Comma-separated field paths to write, e.g. `config.accessType,config.moderation`. Use `*` to overwrite every field.",
    },
    {
      key: "accessType",
      label: "Access type",
      type: "select",
      options: [
        { value: "OPEN", label: "Open" },
        { value: "TRUSTED", label: "Trusted" },
        { value: "RESTRICTED", label: "Restricted" },
      ],
    },
    {
      key: "entryPointAccess",
      label: "Entry point access",
      type: "select",
      options: [
        { value: "ALL", label: "All entry points" },
        { value: "CREATOR_APP_ONLY", label: "Creator app only" },
      ],
    },
    {
      key: "moderation",
      label: "Moderation",
      type: "select",
      options: [
        { value: "OFF", label: "Off" },
        { value: "ON", label: "On" },
      ],
    },
    {
      key: "moderationRestrictions",
      label: "Moderation restrictions",
      type: "json",
      hint:
        'A ModerationRestrictions object: { "chatRestriction", "reactionRestriction", "presentRestriction", "defaultJoinAsViewerType" }.',
    },
    {
      key: "artifactConfig",
      label: "Artifact config",
      type: "json",
      hint:
        'An ArtifactConfig object: { "recordingConfig", "transcriptionConfig", "smartNotesConfig" }.',
    },
    {
      key: "attendanceReportGenerationType",
      label: "Attendance report generation",
      type: "select",
      options: [
        { value: "GENERATE_REPORT", label: "Generate report" },
        { value: "DO_NOT_GENERATE", label: "Do not generate" },
      ],
    },
  ],
  output: [
    { key: "name", type: "string", label: "Space name" },
    { key: "meetingUri", type: "string", label: "Meeting URI" },
    { key: "meetingCode", type: "string", label: "Meeting code" },
    { key: "config", type: "object", label: "Space configuration" },
    { key: "activeConference", type: "object", label: "Active conference" },
    { key: "phoneAccess", type: "array", label: "Phone access" },
    { key: "gatewaySipAccess", type: "array", label: "Gateway SIP access" },
  ],

  execute(input, ctx) {
    const client = new GoogleMeetClient(ctx);
    const config: Record<string, unknown> = {};
    if (input.accessType !== undefined) config.accessType = input.accessType;
    if (input.entryPointAccess !== undefined) config.entryPointAccess = input.entryPointAccess;
    if (input.moderation !== undefined) config.moderation = input.moderation;
    if (input.moderationRestrictions !== undefined) {
      config.moderationRestrictions = input.moderationRestrictions;
    }
    if (input.artifactConfig !== undefined) config.artifactConfig = input.artifactConfig;
    if (input.attendanceReportGenerationType !== undefined) {
      config.attendanceReportGenerationType = input.attendanceReportGenerationType;
    }
    return client.request(`/${input.name}`, {
      method: "PATCH",
      query: { updateMask: input.updateMask },
      body: Object.keys(config).length > 0 ? { config } : {},
    });
  },
};

export default updateSpace;

import type { ActionDefinition } from "@w6w/types";
import { GoogleMeetClient } from "../lib/client.ts";

interface Input {
  accessType?: "OPEN" | "TRUSTED" | "RESTRICTED";
  entryPointAccess?: "ALL" | "CREATOR_APP_ONLY";
  moderation?: "OFF" | "ON";
  moderationRestrictions?: Record<string, unknown>;
  artifactConfig?: Record<string, unknown>;
  attendanceReportGenerationType?: "GENERATE_REPORT" | "DO_NOT_GENERATE";
}

/**
 * `meet.spaces.create` — POST `v2/spaces`
 * (https://meet.googleapis.com/$discovery/rest?version=v2).
 *
 * The request body is optional: Google server-generates the space `name` and
 * `meetingCode` and returns the whole `Space`. Everything configurable on the
 * new space lives under the returned `config` (a `SpaceConfig`) — this action
 * collects those fields flat and nests them into `{ config: { … } }`, sending
 * no body at all when the caller asks for a plain default space.
 */
const createSpace: ActionDefinition<Input> = {
  key: "create-space",
  type: "perform",
  resource: "space",
  title: "Create Space",
  description:
    "Create a meeting space and return it. Google generates the meeting code and join URI; the optional fields below become the space's `config`.",
  idempotent: false,
  params: [
    {
      key: "accessType",
      label: "Access type",
      type: "select",
      options: [
        {
          value: "OPEN",
          label: "Open",
          description: "Anyone with the join info can join without knocking.",
        },
        {
          value: "TRUSTED",
          label: "Trusted",
          description: "The host's org and invitees join without knocking.",
        },
        {
          value: "RESTRICTED",
          label: "Restricted",
          description: "Only invitees join without knocking.",
        },
      ],
      hint: "Who can join without knocking. Defaults to the user's admin-controlled setting.",
    },
    {
      key: "entryPointAccess",
      label: "Entry point access",
      type: "select",
      options: [
        { value: "ALL", label: "All entry points" },
        {
          value: "CREATOR_APP_ONLY",
          label: "Creator app only",
          description: "Only entry points owned by the Cloud project that created the space.",
        },
      ],
      hint: "Which entry points may be used to join. Defaults to ALL.",
    },
    {
      key: "moderation",
      label: "Moderation",
      type: "select",
      options: [
        { value: "OFF", label: "Off" },
        { value: "ON", label: "On" },
      ],
      hint: "Pre-configured moderation mode. Defaults to the user's policies.",
    },
    {
      key: "moderationRestrictions",
      label: "Moderation restrictions",
      type: "json",
      hint:
        'A ModerationRestrictions object (applies when moderation is ON): { "chatRestriction", "reactionRestriction", "presentRestriction", "defaultJoinAsViewerType" }, each a RESTRICTION_TYPE_* / ON-OFF enum.',
    },
    {
      key: "artifactConfig",
      label: "Artifact config",
      type: "json",
      hint:
        'An ArtifactConfig object: { "recordingConfig": { "autoRecordingGeneration" }, "transcriptionConfig": { "autoTranscriptionGeneration" }, "smartNotesConfig": { "autoSmartNotesGeneration" } }, each ON/OFF.',
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
    const body = Object.keys(config).length > 0 ? { config } : undefined;
    return client.request("/spaces", { method: "POST", body });
  },
};

export default createSpace;

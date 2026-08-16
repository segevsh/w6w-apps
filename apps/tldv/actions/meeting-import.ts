import type { ActionDefinition } from "@w6w/types";
import { TldvClient } from "../lib/client.ts";

/**
 * `POST /v1alpha1/meetings/import` — import a recording from a publicly
 * reachable URL, as if it were a tl;dv meeting.
 *
 * The request body has no schema in the OpenAPI document's own `requestBody`
 * (`"schema": {}`), so every field below is taken from the separate
 * `MeetingImportControllerBody` component schema instead, which is not wired
 * to the operation but carries the real shape and is what the vendor's own
 * code samples send.
 *
 * ## Supported formats, and what "publicly accessible" means
 *
 * `.mp3, .mp4, .wav, .m4a, .mkv, .mov, .avi, .wma, .flac` — the vendor's own
 * list. The URL must be reachable with no auth of its own: tl;dv's importer
 * fetches it directly, so a signed URL that expires quickly or a host that
 * requires a cookie/header will fail the import silently on tl;dv's side.
 *
 * ## This starts an async job — it does not return the imported meeting
 *
 * The response is `{success, jobId, message}`, not a `Meeting`. There is no
 * documented "get import job status" endpoint, so the only way to find the
 * resulting meeting today is to list/search meetings afterwards (by `name` or
 * recency) once processing finishes.
 */
interface Input {
  name: string;
  url: string;
  happenedAt?: string;
  dryRun?: boolean;
  participants?: string[];
}

const meetingImport: ActionDefinition<Input> = {
  key: "meeting-import",
  type: "perform",
  resource: "meeting",
  title: "Import Meeting",
  description: "Import a recording from a publicly accessible URL as a tl;dv meeting.",
  // Every call starts a new import job; there is no documented idempotency
  // key and no way to ask tl;dv "did this URL already get imported".
  idempotent: false,
  params: [
    {
      key: "name",
      label: "Name",
      type: "string",
      required: true,
      placeholder: "1:1 John x Sarah",
      hint: "The name the imported meeting/recording gets in tl;dv.",
    },
    {
      key: "url",
      label: "Recording URL",
      type: "string",
      required: true,
      hint: "Must be publicly accessible with no auth of its own — tl;dv fetches it directly. " +
        "Supported formats: .mp3, .mp4, .wav, .m4a, .mkv, .mov, .avi, .wma, .flac.",
    },
    {
      key: "happenedAt",
      label: "Happened at",
      type: "string",
      placeholder: "2024-01-15T09:00:00.000Z",
      hint: "ISO 8601 with fractional seconds, e.g. 2024-01-15T09:00:00.000Z. Defaults to now if " +
        "left empty.",
    },
    {
      key: "participants",
      label: "Participants",
      type: "array",
      item: { type: "string", placeholder: "name@example.com" },
      hint: "Email addresses of the participants to invite to the imported meeting.",
    },
    {
      key: "dryRun",
      label: "Dry run",
      type: "boolean",
      advanced: true,
      hint: "Validate without persisting or actually running the import. For testing this action.",
    },
  ],
  output: [
    { key: "success", type: "boolean", label: "Whether the import request was accepted" },
    { key: "jobId", type: "string", label: "Id of the import job that was created" },
    { key: "message", type: "string", label: "Result message" },
  ],

  execute(input, ctx) {
    return new TldvClient(ctx).post("/meetings/import", {
      body: {
        name: input.name,
        url: input.url,
        happenedAt: input.happenedAt || undefined,
        dryRun: input.dryRun,
        participants: input.participants,
      },
    });
  },
};

export default meetingImport;

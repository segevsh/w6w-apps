import type { ActionDefinition } from "@w6w/types";
import { compact, USER, WakaClient } from "../lib/client.ts";

interface Input {
  externalId: string;
  entity: string;
  type: string;
  category?: string;
  startTime: number;
  endTime: number;
  project?: string;
  branch?: string;
  language?: string;
  meta?: string;
}

/** `POST /api/v1/users/current/external_durations` */
const externalDurationCreate: ActionDefinition<Input> = {
  key: "external-duration-create",
  type: "perform",
  resource: "external-duration",
  title: "Create External Duration",
  description:
    "Log a span of activity with a start and end time when heartbeats are not available, e.g. a meeting. WakaTime documents this as for OAuth apps; an API key may be refused.",
  idempotent: false,
  params: [
    {
      key: "externalId",
      label: "External ID",
      type: "string",
      required: true,
      hint: "Your own unique id for this duration, so it can be reproduced.",
    },
    {
      key: "entity",
      label: "Entity",
      type: "string",
      required: true,
      hint: "What the time is logged against: a file path, domain or event title.",
    },
    {
      key: "type",
      label: "Entity type",
      type: "select",
      required: true,
      options: [
        { value: "file", label: "File" },
        { value: "app", label: "App" },
        { value: "event", label: "Event" },
        { value: "url", label: "URL" },
        { value: "domain", label: "Domain" },
      ],
    },
    {
      key: "category",
      label: "Category",
      type: "string",
      hint: "e.g. coding, communicating, designing. Inferred from the type when omitted.",
    },
    {
      key: "startTime",
      label: "Start (UNIX epoch)",
      type: "number",
      required: true,
      hint: "Seconds since the epoch.",
    },
    {
      key: "endTime",
      label: "End (UNIX epoch)",
      type: "number",
      required: true,
      hint: "Seconds since the epoch.",
    },
    { key: "project", label: "Project", type: "string" },
    { key: "branch", label: "Branch", type: "string" },
    { key: "language", label: "Language", type: "string" },
    {
      key: "meta",
      label: "Meta",
      type: "string",
      hint: "Free text up to 2083 characters, matched only by custom rules.",
    },
  ],
  output: [
    { key: "data", type: "object", label: "The created external duration" },
  ],

  execute(input, ctx) {
    return new WakaClient(ctx).request("POST", `${USER}/external_durations`, {
      body: compact({
        external_id: input.externalId,
        entity: input.entity,
        type: input.type,
        category: input.category,
        start_time: input.startTime,
        end_time: input.endTime,
        project: input.project,
        branch: input.branch,
        language: input.language,
        meta: input.meta,
      }),
    });
  },
};

export default externalDurationCreate;

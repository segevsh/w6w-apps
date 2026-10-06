import type { ActionDefinition } from "@w6w/types";
import { compact, USER, WakaClient } from "../lib/client.ts";

interface Input {
  entity: string;
  type: string;
  time: number;
  category?: string;
  project?: string;
  branch?: string;
  language?: string;
  dependencies?: string;
  lines?: number;
  lineno?: number;
  cursorpos?: number;
  isWrite?: boolean;
}

/** `POST /api/v1/users/current/heartbeats` */
const heartbeatCreate: ActionDefinition<Input> = {
  key: "heartbeat-create",
  type: "perform",
  resource: "heartbeat",
  title: "Create Heartbeat",
  description:
    "Send one heartbeat: a ping saying the user is working on an entity at a time. Editor and OS are detected by WakaTime from the User-Agent.",
  idempotent: false,
  params: [
    {
      key: "entity",
      label: "Entity",
      type: "string",
      required: true,
      hint: "The file path, app or domain the activity is logged against.",
    },
    {
      key: "type",
      label: "Entity type",
      type: "select",
      required: true,
      options: [{ value: "file", label: "File" }, { value: "app", label: "App" }, {
        value: "url",
        label: "URL",
      }, { value: "domain", label: "Domain" }],
    },
    {
      key: "time",
      label: "Time (UNIX epoch)",
      type: "number",
      required: true,
      hint: "Seconds since the epoch; fractions allowed.",
    },
    {
      key: "category",
      label: "Category",
      type: "string",
      hint:
        "coding, building, debugging, browsing, code reviewing, ai coding ... Inferred from the type when omitted.",
    },
    { key: "project", label: "Project", type: "string" },
    { key: "branch", label: "Branch", type: "string" },
    { key: "language", label: "Language", type: "string" },
    {
      key: "dependencies",
      label: "Dependencies",
      type: "string",
      hint: "Comma-separated dependency names.",
    },
    {
      key: "lines",
      label: "Lines in file",
      type: "number",
      hint: "Total line count of the entity (files only).",
    },
    { key: "lineno", label: "Cursor line", type: "number", hint: "1-based." },
    { key: "cursorpos", label: "Cursor column", type: "number", hint: "1-based." },
    {
      key: "isWrite",
      label: "Is write",
      type: "boolean",
      hint: "Whether this was triggered by saving a file.",
    },
  ],
  output: [
    { key: "data", type: "object", label: "The created heartbeat (id, entity, type, time)" },
  ],

  execute(input, ctx) {
    return new WakaClient(ctx).request("POST", `${USER}/heartbeats`, {
      body: compact({
        entity: input.entity,
        type: input.type,
        time: input.time,
        category: input.category,
        project: input.project,
        branch: input.branch,
        language: input.language,
        dependencies: input.dependencies,
        lines: input.lines,
        lineno: input.lineno,
        cursorpos: input.cursorpos,
        is_write: input.isWrite,
      }),
    });
  },
};

export default heartbeatCreate;

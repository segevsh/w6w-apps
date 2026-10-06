import type { ActionDefinition } from "@w6w/types";
import { call, parseJsonField, pick, requireStr } from "../lib/client.ts";
import { bool, json, str, text } from "../lib/params.ts";

type Input = Record<string, unknown>;

const todoCreate: ActionDefinition<Input> = {
  key: "todo-create",
  type: "perform",
  resource: "timeline",
  title: "Create To Do",
  description:
    "Add a to-do (with an optional reminder) to Cloze, linked to people, companies or projects.",
  idempotent: false,
  params: [
    str("subject", "Subject", { required: true }),
    str("when", "When", { hint: "Reminder date, or a UTC timestamp in ms. Empty = someday." }),
    text("preview", "Details"),
    json("references", "References", {
      hint:
        'JSON array of {"name": "...", "type": "person|company|project", "ids": ["..."]} naming the records this belongs to.',
    }),
    str("assignee", "Assignee", { hint: "Team member e-mail; defaults to the API key owner." }),
    str("assigner", "Assigner"),
    bool("dryrun", "Dry run"),
  ],
  output: [
    { key: "ok", type: "boolean", label: "Accepted by Cloze" },
    { key: "message", type: "string", label: "Cloze's message" },
  ],

  async execute(input, ctx) {
    const res = await call(ctx, "POST", "/v1/timeline/todo/create", {
      body: {
        subject: requireStr("subject", input.subject),
        ...pick(input, ["when", "preview", "assignee", "assigner", "dryrun"]),
        ...(input.references ? { references: parseJsonField("references", input.references) } : {}),
      },
    });
    return { ok: true, message: res.message ?? null };
  },
};

export default todoCreate;

import type { ActionDefinition } from "@w6w/types";
import { call, parseJsonField, pick } from "../lib/client.ts";
import { bool, json, select, str, text } from "../lib/params.ts";

type Input = Record<string, unknown>;

const contentCreate: ActionDefinition<Input> = {
  key: "content-create",
  type: "perform",
  resource: "timeline",
  title: "Add Note or Event",
  description: "Add a note, event, to-do or file record to the Cloze timeline, linked to records.",
  idempotent: false,
  params: [
    select("style", "Style", ["note", "event", "todo", "file"], { required: true }),
    str("subject", "Subject"),
    text("body", "Body"),
    select("bodytype", "Body type", ["html", "text"]),
    str("date", "Date"),
    str("from", "From"),
    str("name", "From name"),
    str("uniqueid", "Unique ID", { hint: "Required by Cloze for note and todo styles." }),
    str("source", "Source domain", {
      hint: "Required by Cloze for note and todo styles, e.g. todoist.com.",
    }),
    str("threadid", "Thread ID"),
    json("references", "References", {
      hint:
        'JSON array of {"name": "...", "type": "person|company|project", "ids": ["..."]} naming the records this belongs to.',
    }),
    bool("update", "Update if already imported"),
    bool("dryrun", "Dry run"),
  ],
  output: [
    { key: "ok", type: "boolean", label: "Accepted by Cloze" },
    { key: "message", type: "string", label: "Cloze's message" },
  ],

  async execute(input, ctx) {
    if (!String(input.style ?? "").trim()) throw new Error("style is required");
    const res = await call(ctx, "POST", "/v1/timeline/content/create", {
      body: {
        ...pick(input, [
          "style",
          "subject",
          "body",
          "bodytype",
          "date",
          "from",
          "name",
          "uniqueid",
          "source",
          "threadid",
          "update",
          "dryrun",
        ]),
        ...(input.references ? { references: parseJsonField("references", input.references) } : {}),
      },
    });
    return { ok: true, message: res.message ?? null };
  },
};

export default contentCreate;

import type { ActionDefinition } from "@w6w/types";
import { call, parseJsonField, pick } from "../lib/client.ts";
import { bool, json, select, str, text } from "../lib/params.ts";

type Input = Record<string, unknown>;

const communicationCreate: ActionDefinition<Input> = {
  key: "communication-create",
  type: "perform",
  resource: "timeline",
  title: "Add Communication Record",
  description: "Record an e-mail, call, text, meeting or message on the Cloze timeline.",
  idempotent: false,
  params: [
    select("style", "Style", [
      "email",
      "call",
      "text",
      "meeting",
      "message",
      "inapp",
      "postal",
      "postal-bulk",
    ], { required: true }),
    str("subject", "Subject"),
    text("body", "Body"),
    select("bodytype", "Body type", ["html", "text"]),
    str("date", "Date", { hint: "Date string or UTC ms. Default now." }),
    str("from", "From", { hint: "E-mail, phone number or handle." }),
    str("name", "From name"),
    json("recipients", "Recipients", { hint: 'JSON array of {"name", "value", "role"}.' }),
    select("direction", "Direction", ["inbound", "outbound"]),
    str("threadid", "Thread ID"),
    str("key", "Unique key", { hint: "Your own ID, so a repeat is matched to the same record." }),
    json("references", "References", {
      hint:
        'JSON array of {"name": "...", "type": "person|company|project", "ids": ["..."]} naming the records this belongs to.',
    }),
    bool("dryrun", "Dry run"),
  ],
  output: [
    { key: "ok", type: "boolean", label: "Accepted by Cloze" },
    { key: "message", type: "string", label: "Cloze's message" },
  ],

  async execute(input, ctx) {
    if (!String(input.style ?? "").trim()) throw new Error("style is required");
    const res = await call(ctx, "POST", "/v1/timeline/communication/create", {
      body: {
        ...pick(input, [
          "style",
          "subject",
          "body",
          "bodytype",
          "date",
          "from",
          "name",
          "direction",
          "threadid",
          "key",
          "dryrun",
        ]),
        ...(input.recipients ? { recipients: parseJsonField("recipients", input.recipients) } : {}),
        ...(input.references ? { references: parseJsonField("references", input.references) } : {}),
      },
    });
    return { ok: true, message: res.message ?? null };
  },
};

export default communicationCreate;

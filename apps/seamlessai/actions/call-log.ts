import type { ActionDefinition } from "@w6w/types";
import { compact, need, SeamlessClient, toInt } from "../lib/client.ts";

/** `POST /api/client/v2/calls/log` — Log Call. */
interface Input {
  contactId: number;
  toNumber?: string;
  fromNumber?: string;
  callDispositionId?: number;
  callSentimentId?: number;
  callScript?: string;
  durationMs?: number;
  calledAt?: string;
  taskId?: number;
}

const callLog: ActionDefinition<Input> = {
  key: "call-log",
  type: "perform",
  resource: "call",
  title: "Log Call",
  description: "Record a call against a contact.",
  idempotent: false,
  params: [
    {
      key: "contactId",
      label: "Contact ID",
      type: "number",
      required: true,
      validation: { integer: true },
      hint: "Integer contact ID from contacts-list.",
    },
    { key: "toNumber", label: "To number", type: "string" },
    { key: "fromNumber", label: "From number", type: "string" },
    {
      key: "callDispositionId",
      label: "Disposition ID",
      type: "number",
      validation: { integer: true },
      hint: "From call-dispositions-list.",
    },
    {
      key: "callSentimentId",
      label: "Sentiment ID",
      type: "number",
      validation: { integer: true },
      hint: "From call-sentiments-list.",
    },
    { key: "callScript", label: "Call script", type: "text" },
    { key: "durationMs", label: "Duration (ms)", type: "number", validation: { integer: true } },
    { key: "calledAt", label: "Called at", type: "datetime", hint: "ISO 8601." },
    { key: "taskId", label: "Task ID", type: "number", validation: { integer: true } },
  ],
  output: [
    { key: "success", type: "boolean", label: "Whether the call succeeded" },
    { key: "data", type: "object", label: "The record" },
  ],

  async execute(input, ctx) {
    return await new SeamlessClient(ctx).request("POST", "/calls/log", {
      body: compact({
        contactId: need(toInt(input.contactId, "Contact ID"), "Contact ID"),
        toNumber: input.toNumber,
        fromNumber: input.fromNumber,
        callDispositionId: toInt(input.callDispositionId, "Disposition ID"),
        callSentimentId: toInt(input.callSentimentId, "Sentiment ID"),
        callScript: input.callScript,
        durationMs: toInt(input.durationMs, "Duration (ms)"),
        calledAt: input.calledAt,
        taskId: toInt(input.taskId, "Task ID"),
      }),
    });
  },
};

export default callLog;

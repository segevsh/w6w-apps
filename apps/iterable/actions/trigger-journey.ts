import type { ActionDefinition } from "@w6w/types";
import { call, compact, int, jsonObject, str } from "../lib/client.ts";

/**
 * `POST /api/workflows/triggerWorkflow` — verified 2026-10-06 against Iterable's Swagger document
 * (`https://api.iterable.com/api-docs`).
 */
const action: ActionDefinition = {
  key: "trigger-journey",
  type: "perform",
  resource: "journey",
  title: "Trigger Journey",
  description:
    "Enter a user (or every user of a list) into a journey that starts with an API trigger.",
  idempotent: false,
  params: [
    {
      key: "workflowId",
      label: "Journey ID",
      type: "number",
      required: true,
      hint: "The journey's id (Iterable still calls it workflowId).",
    },
    { key: "email", label: "Email", type: "string", hint: "The user's email address." },
    { key: "userId", label: "User ID", type: "string", hint: "The user's userId." },
    {
      key: "listId",
      label: "List ID",
      type: "number",
      hint: "Trigger for every user on this list instead of one user.",
    },
    {
      key: "dataFields",
      label: "Data Fields",
      type: "json",
      hint: "Data made available to the journey.",
    },
  ],
  output: [
    { key: "code", type: "string", label: "Iterable result code (Success)" },
    { key: "msg", type: "string", label: "Iterable message" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const workflowId = int("workflowId", p.workflowId);
    const email = str(p.email);
    const userId = str(p.userId);
    const listId = int("listId", p.listId);
    const dataFields = jsonObject("dataFields", p.dataFields);
    if (workflowId === undefined) throw new Error("`workflowId` is required");
    ctx.log("info", "Iterable Trigger Journey", { workflowId });
    const out = await call(ctx, "POST", "/workflows/triggerWorkflow", {
      body: compact({
        "workflowId": workflowId,
        "email": email,
        "userId": userId,
        "listId": listId,
        "dataFields": dataFields,
      }),
    });
    return out;
  },
};

export default action;

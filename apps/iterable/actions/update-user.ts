import type { ActionDefinition } from "@w6w/types";
import { bool, call, compact, jsonObject, oneOf, str } from "../lib/client.ts";

/**
 * `POST /api/users/update` — verified 2026-10-06 against Iterable's Swagger document
 * (`https://api.iterable.com/api-docs`).
 */
const action: ActionDefinition = {
  key: "update-user",
  type: "perform",
  resource: "user",
  title: "Update User",
  description:
    "Create or update a user profile. Data is merged: fields you omit are not deleted. Field types must match what the project already holds.",
  idempotent: true,
  params: [
    { key: "email", label: "Email", type: "string", hint: "The user's email address." },
    { key: "userId", label: "User ID", type: "string", hint: "The user's userId." },
    {
      key: "dataFields",
      label: "Data Fields",
      type: "json",
      hint: "Custom data fields as a JSON object.",
    },
    {
      key: "mergeNestedObjects",
      label: "Merge Nested Objects",
      type: "boolean",
      hint: "Merge top-level objects instead of overwriting them.",
    },
    {
      key: "preferUserId",
      label: "Prefer User ID",
      type: "boolean",
      hint: "In a hybrid project, identify the user by userId when both are given.",
    },
    {
      key: "createNewFields",
      label: "Create New Fields",
      type: "boolean",
      hint: "Create unknown data fields automatically (default true).",
    },
  ],
  output: [
    { key: "code", type: "string", label: "Iterable result code (Success)" },
    { key: "msg", type: "string", label: "Iterable message" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const email = str(p.email);
    const userId = str(p.userId);
    const dataFields = jsonObject("dataFields", p.dataFields);
    const mergeNestedObjects = bool(p.mergeNestedObjects);
    const preferUserId = bool(p.preferUserId);
    const createNewFields = bool(p.createNewFields);
    oneOf(["email", "userId"], { "email": email, "userId": userId }, "at-least-one");
    ctx.log("info", "Iterable Update User");
    const out = await call(ctx, "POST", "/users/update", {
      body: compact({
        "email": email,
        "userId": userId,
        "dataFields": dataFields,
        "mergeNestedObjects": mergeNestedObjects,
        "preferUserId": preferUserId,
        "createNewFields": createNewFields,
      }),
    });
    return out;
  },
};

export default action;

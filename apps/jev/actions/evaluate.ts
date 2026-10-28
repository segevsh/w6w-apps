import type { ActionDefinition } from "@w6w/types";
import { JevClient } from "../lib/client.ts";

interface Input {
  model: string;
  state: unknown;
  questions: Record<string, { type: string; [key: string]: unknown }>;
}

/**
 * POST /v1/systemone — evaluate a described state against a map of typed
 * questions. Returns one typed answer per question id.
 */
const evaluate: ActionDefinition<Input> = {
  key: "evaluate",
  type: "perform",
  resource: "evaluation",
  title: "Evaluate",
  description: "Answer a map of typed questions about a state with Jev System One.",
  params: [
    { key: "model", label: "Model", type: "string", required: true, hint: "See List Models." },
    {
      key: "state",
      label: "State",
      type: "json",
      required: true,
      hint: "Text, or a structured description of the state to evaluate.",
    },
    {
      key: "questions",
      label: "Questions",
      type: "json",
      required: true,
      hint: "Map of question id → `{ type, ... }`.",
    },
  ],
  output: [
    { key: "model", type: "string", label: "Model" },
    { key: "answers", type: "object", label: "Answers" },
    { key: "usage", type: "object", label: "Usage" },
  ],

  execute({ model, state, questions }, ctx) {
    return new JevClient(ctx).request("/systemone", {
      method: "POST",
      body: { model, state, questions },
    });
  },
};

export default evaluate;

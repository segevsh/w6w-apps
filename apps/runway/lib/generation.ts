import type { ActionDefinition, Param } from "@w6w/types";
import { compact, extraFields, need, RunwayClient } from "./client.ts";

/**
 * Every Runway generation endpoint has the same contract: `POST /v1/<path>` with a JSON body
 * that is a discriminated union on `model`, answering `{ id }` — a task id. The valid fields
 * differ per model (verified against the OpenAPI `oneOf` variants, 2026-10-06), so each
 * action exposes the commonly used fields as typed params and an `extra` JSON object that is
 * merged into the body for any model-specific field. Typed params win over `extra`.
 */
export const EXTRA: Param = {
  key: "extra",
  label: "Extra fields (JSON)",
  type: "json",
  hint: "A JSON object merged into the request body, for a field this form does not list. " +
    "Valid fields depend on the model — see the model's entry in the Runway API reference.",
};

export const MODERATION: Param = {
  key: "publicFigureThreshold",
  label: "Public figure moderation",
  type: "select",
  options: [{ value: "auto", label: "Auto (default)" }, {
    value: "low",
    label: "Low (less strict)",
  }],
  hint: "contentModeration.publicFigureThreshold. Moderation refusals arrive as a FAILED task.",
};

export const SEED: Param = {
  key: "seed",
  label: "Seed",
  type: "number",
  validation: { min: 0, max: 4294967295, integer: true },
  hint: "Same seed + same request gives similar results. Random when omitted.",
};

export function modelParam(hint: string, defaultValue?: string): Param {
  return {
    key: "model",
    label: "Model",
    type: "string",
    required: true,
    ...(defaultValue ? { default: defaultValue } : {}),
    hint,
  };
}

/** `contentModeration` member for the body, or undefined. */
export function moderation(threshold: unknown): { publicFigureThreshold: string } | undefined {
  const v = String(threshold ?? "").trim();
  return v ? { publicFigureThreshold: v } : undefined;
}

export const TASK_OUTPUT = [
  { key: "taskId", type: "string" as const, label: "Task id — poll it with Get Task" },
];

interface GenerationSpec<I> {
  key: string;
  title: string;
  description: string;
  /** e.g. `/v1/text_to_video` */
  path: string;
  params: Param[];
  /** The typed part of the body; `model` and `extra` are handled here. */
  build: (input: I) => Record<string, unknown>;
}

export function generationAction<I extends Record<string, unknown>>(
  spec: GenerationSpec<I>,
): ActionDefinition<I> {
  return {
    key: spec.key,
    type: "perform",
    idempotent: false,
    resource: "task",
    title: spec.title,
    description: `${spec.description} Asynchronous: returns a task id; read the result with ` +
      "Get Task. Spends credits.",
    params: [...spec.params, EXTRA],
    output: TASK_OUTPUT,

    async execute(input, ctx) {
      const model = need(input.model, "model");
      const body = {
        ...extraFields(input.extra),
        ...compact(spec.build(input)),
        model,
      };
      const { data } = await new RunwayClient(ctx).request(spec.path, { method: "POST", body });
      return { taskId: (data as { id?: string } | undefined)?.id };
    },
  };
}

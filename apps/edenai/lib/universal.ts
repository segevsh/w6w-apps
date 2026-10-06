import type { ActionDefinition, HookContext, OutputField, Param } from "@w6w/types";
import { compact, EdenClient, list, parseJson, truncate } from "./client.ts";

/**
 * Universal AI - the non-LLM "expert model" endpoints.
 *
 * `POST /v3/universal-ai` (sync) and `POST /v3/universal-ai/async` share one request shape:
 * `{ model: "feature/subfeature/provider[/model]", input: {...feature fields}, fallbacks?,
 * provider_params?, show_original_response? }`. The `input` field names per feature were read from
 * the live catalog (`GET /v3/info?include=schemas`, `input_schema.fields`) on 2026-10-06.
 *
 * ## A 200 can still be a failure
 *
 * The envelope carries its own `status` (`success` | `fail`, plus `processing` for async). A
 * provider failure is reported as `status: "fail"` with an `error` object, so an Action that only
 * looked at the HTTP code would hand a failed call to the next workflow step as if it had worked.
 * {@link runUniversal} throws on `status: "fail"`.
 */

export interface UniversalEnvelope {
  status?: string;
  cost?: string | number;
  provider?: string;
  feature?: string;
  subfeature?: string;
  output?: unknown;
  error?: unknown;
  original_response?: unknown;
  public_id?: string;
  model?: string | null;
  created_at?: string;
}

export interface UniversalCall {
  feature: string;
  subfeature: string;
  /** `provider` or `provider/model`, e.g. `deepl` or `openai/gpt-4o`. */
  provider: string;
  input: Record<string, unknown>;
  fallbacks?: string | string[];
  providerParams?: unknown;
  showOriginalResponse?: boolean;
  /** Async only. */
  webhookReceiver?: string;
}

/** `feature/subfeature/provider[/model]`. */
export function modelString(feature: string, subfeature: string, provider: string): string {
  const p = provider.trim().replace(/^\/+|\/+$/g, "");
  if (!p) throw new Error(`provider is required for ${feature}/${subfeature}`);
  return `${feature}/${subfeature}/${p}`;
}

export function buildBody(call: UniversalCall): Record<string, unknown> {
  const fallbacks = list(call.fallbacks);
  if (fallbacks.length > 3) throw new Error("Eden AI accepts at most 3 fallback providers");
  return compact({
    model: modelString(call.feature, call.subfeature, call.provider),
    input: call.input,
    fallbacks,
    provider_params: parseJson(call.providerParams, "Provider parameters"),
    show_original_response: call.showOriginalResponse ? true : undefined,
    webhook_receiver: call.webhookReceiver,
  });
}

function describeError(error: unknown): string {
  if (typeof error === "string") return error;
  if (error && typeof error === "object") {
    const e = error as { message?: unknown; type?: unknown; code?: unknown };
    if (typeof e.message === "string") return e.message;
    return truncate(JSON.stringify(error), 400);
  }
  return "no error detail";
}

export async function runUniversal(
  ctx: HookContext,
  call: UniversalCall,
): Promise<UniversalEnvelope> {
  const res = await new EdenClient(ctx).json<UniversalEnvelope>("/universal-ai", {
    method: "POST",
    body: buildBody(call),
  });
  if (res.status === "fail") {
    throw new Error(
      `Eden AI ${call.feature}/${call.subfeature} failed on ${res.provider ?? call.provider}: ${
        describeError(res.error)
      }`,
    );
  }
  return res;
}

export async function startUniversalAsync(
  ctx: HookContext,
  call: UniversalCall,
): Promise<UniversalEnvelope> {
  return await new EdenClient(ctx).json<UniversalEnvelope>("/universal-ai/async", {
    method: "POST",
    body: buildBody(call),
  });
}

/** Result of a sync Universal AI action. */
export function shapeSync(res: UniversalEnvelope): Record<string, unknown> {
  return {
    status: res.status,
    provider: res.provider,
    cost: res.cost === undefined ? undefined : Number(res.cost),
    feature: res.feature,
    subfeature: res.subfeature,
    output: res.output,
    originalResponse: res.original_response,
  };
}

/** Result of starting an async job: the job id is the only thing the next step needs. */
export function shapeJob(res: UniversalEnvelope): Record<string, unknown> {
  return {
    jobId: res.public_id,
    status: res.status,
    provider: res.provider,
    feature: res.feature,
    subfeature: res.subfeature,
    model: res.model ?? undefined,
    createdAt: res.created_at,
  };
}

/** The params every Universal AI action shares, appended after its own fields. */
export function commonParams(defaultProvider: string, providerHint: string): Param[] {
  return [
    {
      key: "provider",
      label: "Provider",
      type: "string",
      required: true,
      default: defaultProvider,
      hint: providerHint +
        " A provider optionally takes a model: `provider/model` (for example `openai/gpt-4o`).",
    },
    {
      key: "fallbacks",
      label: "Fallback providers",
      type: "string",
      hint: "Comma-separated providers to try, in order, if the first fails (at most 3).",
    },
    {
      key: "providerParams",
      label: "Provider parameters",
      type: "json",
      hint: "Native parameters in the provider's own format, forwarded alongside the input. " +
        "Some features reject unknown keys; see Get Feature Info.",
    },
  ];
}

export interface CommonInput {
  provider: string;
  fallbacks?: string;
  providerParams?: unknown;
}

export interface UniversalSpec<I extends CommonInput> {
  key: string;
  title: string;
  description: string;
  feature: string;
  subfeature: string;
  defaultProvider: string;
  providerHint: string;
  params: Param[];
  /** Map the action's input to the feature's `input` object. */
  buildInput(input: I): Record<string, unknown>;
  /** Top-level output fields that are copied out of `output` for convenience. */
  promote?: OutputField[];
}

/** Build a synchronous Universal AI action from a table row. */
export function defineUniversal<I extends CommonInput>(
  spec: UniversalSpec<I>,
): ActionDefinition<I> {
  return {
    key: spec.key,
    type: "perform",
    resource: spec.feature,
    title: spec.title,
    description: spec.description,
    // Every call is billed and a provider may answer differently on retry: not safe to repeat.
    idempotent: false,
    params: [...spec.params, ...commonParams(spec.defaultProvider, spec.providerHint)],
    output: [
      ...(spec.promote ?? []),
      { key: "output", type: "object", label: "Normalized provider output" },
      { key: "provider", type: "string", label: "Provider that served the call" },
      { key: "cost", type: "number", label: "Cost in credits (USD)" },
      { key: "feature", type: "string", label: "Feature" },
      { key: "subfeature", type: "string", label: "Subfeature" },
    ],
    async execute(input, ctx) {
      const res = await runUniversal(ctx, {
        feature: spec.feature,
        subfeature: spec.subfeature,
        provider: input.provider,
        fallbacks: input.fallbacks,
        providerParams: input.providerParams,
        input: spec.buildInput(input),
      });
      const shaped = shapeSync(res);
      const out = (res.output ?? {}) as Record<string, unknown>;
      for (const p of spec.promote ?? []) {
        if (!(p.key in shaped)) shaped[p.key] = out[p.key];
      }
      return shaped;
    },
  };
}

export interface UniversalAsyncSpec<I extends CommonInput & { webhookReceiver?: string }> {
  key: string;
  title: string;
  description: string;
  feature: string;
  subfeature: string;
  defaultProvider: string;
  providerHint: string;
  params: Param[];
  buildInput(input: I): Record<string, unknown>;
}

/** Output of every "start an async job" action. */
export const JOB_OUTPUT: OutputField[] = [
  { key: "jobId", type: "string", label: "Job ID (poll with Get Async Job)" },
  { key: "status", type: "string", label: "Status (processing, success or fail)" },
  { key: "provider", type: "string", label: "Provider" },
  { key: "feature", type: "string", label: "Feature" },
  { key: "subfeature", type: "string", label: "Subfeature" },
  { key: "model", type: "string", label: "Model" },
  { key: "createdAt", type: "string", label: "Created at" },
];

export const WEBHOOK_PARAM: Param = {
  key: "webhookReceiver",
  label: "Webhook URL",
  type: "string",
  hint: "Optional. Eden AI calls this URL when the job finishes, instead of you polling.",
};

/** Build an async Universal AI "start job" action from a table row. */
export function defineUniversalAsync<I extends CommonInput & { webhookReceiver?: string }>(
  spec: UniversalAsyncSpec<I>,
): ActionDefinition<I> {
  return {
    key: spec.key,
    type: "perform",
    resource: spec.feature,
    title: spec.title,
    description: spec.description + " Starts an async job; read the result with Get Async Job.",
    idempotent: false,
    params: [
      ...spec.params,
      ...commonParams(spec.defaultProvider, spec.providerHint),
      WEBHOOK_PARAM,
    ],
    output: JOB_OUTPUT,
    async execute(input, ctx) {
      const res = await startUniversalAsync(ctx, {
        feature: spec.feature,
        subfeature: spec.subfeature,
        provider: input.provider,
        fallbacks: input.fallbacks,
        providerParams: input.providerParams,
        webhookReceiver: input.webhookReceiver,
        input: spec.buildInput(input),
      });
      return shapeJob(res);
    },
  };
}

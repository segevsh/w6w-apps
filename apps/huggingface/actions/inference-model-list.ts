import type { ActionDefinition } from "@w6w/types";
import { HuggingFaceClient, ROUTER } from "../lib/client.ts";

/**
 * `GET router.huggingface.co/v1/models` — what can actually be called.
 *
 * ## The Hub is not the inference catalogue
 *
 * The Hub hosts hundreds of thousands of models. The router serves the fraction
 * that some inference provider has deployed — a few hundred. A model found
 * through `model-search` is very unlikely to be callable, and the failure comes
 * back as a 404 on the completion rather than as anything useful at search
 * time.
 *
 * So this is the list to check before wiring a model into a workflow, and it is
 * the honest answer to "why does this model not work" for most models.
 *
 * ## Each entry names its providers
 *
 * A model served by several providers can be pinned to one, and the entry says
 * which are available. That matters for anything reproducible: the same model
 * on two providers is two different deployments, with different quantisation,
 * different context limits and different prices.
 */
const action: ActionDefinition = {
  key: "inference-model-list",
  type: "read",
  resource: "inference",
  title: "List callable models",
  description:
    "What the router can actually run — a few hundred, against the Hub's hundreds of thousands. " +
    "Check here before wiring a model in; a Hub search result is very unlikely to be callable.",
  params: [
    {
      key: "search",
      label: "Name Contains",
      type: "string",
      default: "",
      hint: "Filtered here — the endpoint returns everything.",
    },
    {
      key: "provider",
      label: "Provider",
      type: "string",
      default: "",
      hint: "Only models this provider serves.",
    },
  ],
  output: [
    { key: "models", type: "array", label: "Callable models" },
    { key: "count", type: "number", label: "Matching" },
    { key: "total", type: "number", label: "Callable in all" },
    { key: "ids", type: "array", label: "Just the ids" },
    { key: "providers", type: "array", label: "The distinct providers seen" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const result = await new HuggingFaceClient(ctx).request<{
      data?: Array<{ id?: string; providers?: Array<{ provider?: string }> }>;
    }>("/v1/models", { host: ROUTER });

    const all = result?.data ?? [];
    let models = all;

    const search = String(p.search ?? "").trim().toLowerCase();
    if (search) {
      models = models.filter((model) => String(model?.id ?? "").toLowerCase().includes(search));
    }
    const provider = String(p.provider ?? "").trim().toLowerCase();
    if (provider) {
      models = models.filter((model) =>
        (model?.providers ?? []).some((entry) =>
          String(entry?.provider ?? "").toLowerCase() === provider
        )
      );
    }

    const providers = new Set<string>();
    for (const model of all) {
      for (const entry of model?.providers ?? []) {
        if (entry?.provider) providers.add(entry.provider);
      }
    }

    return {
      models,
      count: models.length,
      total: all.length,
      ids: models.map((model) => model?.id).filter(Boolean),
      providers: [...providers].sort(),
    };
  },
};

export default action;

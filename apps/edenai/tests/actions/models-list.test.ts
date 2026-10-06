import { assertEquals } from "@std/assert";
import modelsList, { DEFAULT_LIMIT, slim } from "../../actions/models-list.ts";
import { mockCtx, queryOf } from "../_helpers.ts";

const data = [
  {
    id: "openai/gpt-4o",
    owned_by: "openai",
    context_length: 128000,
    description: "Flagship",
    capabilities: { input_modalities: ["text"], output_modalities: ["text"] },
    pricing: { input_cost_per_token: 1e-6, output_cost_per_token: 2e-6 },
  },
  { id: "mistral/large", owned_by: "mistral", description: "Big one" },
  { id: "x/y", owned_by: "x" },
];

Deno.test("slim: keeps the selection fields and drops the rest", () => {
  assertEquals(slim({ ...data[0], source: "https://x" } as never), {
    id: "openai/gpt-4o",
    ownedBy: "openai",
    mode: undefined,
    contextLength: 128000,
    description: "Flagship",
    inputModalities: ["text"],
    outputModalities: ["text"],
    inputCostPerToken: 1e-6,
    outputCostPerToken: 2e-6,
    providerModels: undefined,
  });
});

Deno.test("models-list: filters by search over id and description, then cuts off", async () => {
  const { ctx, calls } = mockCtx([{ body: { data } }, { body: { data } }]);
  const a = await modelsList.execute({ search: "BIG" }, ctx) as {
    models: Array<{ id: string }>;
    totalMatched: number;
  };
  assertEquals(a.models.map((m) => m.id), ["mistral/large"]);
  assertEquals(calls[0].url, "https://api.edenai.run/v3/models");

  const b = await modelsList.execute({ limit: 2 }, ctx) as { count: number; totalMatched: number };
  assertEquals([b.count, b.totalMatched], [2, 3]);
  assertEquals(DEFAULT_LIMIT, 50);
});

Deno.test("models-list: view=models is forwarded and nested endpoints are summarised", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      data: [{
        id: "gpt-4o",
        mode: "chat",
        endpoints: [{ id: "openai/gpt-4o" }, { id: "azure/gpt-4o" }],
      }],
    },
  }]);
  const out = await modelsList.execute({ view: "models" }, ctx) as {
    models: Array<Record<string, unknown>>;
  };
  assertEquals(queryOf(calls[0].url), { view: "models" });
  assertEquals(out.models[0].providerModels, ["openai/gpt-4o", "azure/gpt-4o"]);
});

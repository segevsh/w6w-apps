import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/inference-model-list.ts";

const catalogue = {
  status: 200,
  body: {
    data: [
      {
        id: "meta-llama/Llama-3.3-70B-Instruct",
        providers: [{ provider: "together" }, { provider: "fireworks-ai" }],
      },
      { id: "Qwen/Qwen2.5-7B-Instruct", providers: [{ provider: "together" }] },
      { id: "openai/whisper-large-v3", providers: [{ provider: "hf-inference" }] },
    ],
  },
};

/** The Hub hosts hundreds of thousands; the router serves a few hundred. */
Deno.test("inference-model-list: reads the router, not the Hub", async () => {
  const { ctx, calls } = mockCtx([catalogue]);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(calls[0].url, "https://router.huggingface.co/v1/models");
  assertEquals(result.total, 3);
  assertEquals(result.count, 3);
});

Deno.test("inference-model-list: the name filter is applied here, case-insensitively", async () => {
  const { ctx } = mockCtx([catalogue]);
  const result = await action.execute({ search: "LLAMA" }, ctx) as Record<string, unknown>;
  assertEquals(result.ids, ["meta-llama/Llama-3.3-70B-Instruct"]);
  assertEquals(result.total, 3, "the total stays the catalogue's size");
});

/** The same model on two providers is two different deployments. */
Deno.test("inference-model-list: filters by provider and lists the distinct ones", async () => {
  const { ctx } = mockCtx([catalogue]);
  const result = await action.execute({ provider: "together" }, ctx) as Record<string, unknown>;
  assertEquals(result.count, 2);
  assertEquals(result.providers, ["fireworks-ai", "hf-inference", "together"]);
});

Deno.test("inference-model-list: both filters narrow together", async () => {
  const { ctx } = mockCtx([catalogue]);
  const result = await action.execute({ search: "qwen", provider: "together" }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(result.ids, ["Qwen/Qwen2.5-7B-Instruct"]);
});

Deno.test("inference-model-list: an empty catalogue is not an error", async () => {
  const { ctx } = mockCtx([{ status: 200, body: {} }]);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(result.count, 0);
  assertEquals(result.providers, []);
});

/** A Hub search result is very unlikely to be callable. */
Deno.test("inference-model-list: says it is the callable list, not the Hub's", () => {
  assert(
    /Hub search result is very unlikely to be callable/.test(action.description!),
    action.description,
  );
  assertEquals(action.resource, "inference");
});

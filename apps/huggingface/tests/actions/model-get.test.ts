import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/model-get.ts";

Deno.test("model-get: reads one model", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { id: "openai-community/gpt2", sha: "e7da7f2", downloads: 100, siblings: [] },
  }]);
  const result = await action.execute({ id: "openai-community/gpt2" }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(calls[0].url, "https://huggingface.co/api/models/openai-community/gpt2");
  assertEquals((result.model as Record<string, unknown>).sha, "e7da7f2");
  assertEquals(result.downloads, 100);
});

/** Neither field exists on the search endpoint's summaries. */
Deno.test("model-get: the file list and config come back, unlike from a search", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: {
      id: "openai-community/gpt2",
      siblings: [{ rfilename: "model.safetensors" }],
      config: { architectures: ["GPT2LMHeadModel"] },
    },
  }]);
  const result = await action.execute({ id: "openai-community/gpt2" }, ctx) as Record<
    string,
    unknown
  >;
  const model = result.model as Record<string, unknown>;
  assert(Array.isArray(model.siblings), "siblings tells safetensors from a pickle");
  assert(model.config, "config carries the architecture");
});

Deno.test("model-get: a URL is refused with the id to use instead", async () => {
  const { ctx, calls } = mockCtx([]);
  let message = "";
  try {
    await action.execute({ id: "https://huggingface.co/openai-community/gpt2" }, ctx);
  } catch (err) {
    message = String(err);
  }
  assert(/not a repository id/.test(message), message);
  assertEquals(calls.length, 0, "nothing is requested for an id that cannot be one");
});

Deno.test("model-get: a missing model reports the rename trap", async () => {
  const { ctx } = mockCtx([{ status: 404, body: { error: "Repo not found" } }]);
  let message = "";
  try {
    await action.execute({ id: "someone/gone" }, ctx);
  } catch (err) {
    message = String(err);
  }
  assert(/renamed/.test(message), message);
});

Deno.test("model-get: is a read of one model", () => {
  assertEquals(action.type, "read");
  assertEquals(action.resource, "model");
});

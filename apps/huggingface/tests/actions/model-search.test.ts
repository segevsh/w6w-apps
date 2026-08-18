import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/model-search.ts";

Deno.test("model-search: hits the models endpoint, newest-first by downloads", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [] }]);
  await action.execute({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/models");
  assertEquals(url.searchParams.get("direction"), "-1");
  assertEquals(action.params!.find((p) => p.key === "sort")!.default, "downloads");
});

/** Without it, "whisper" returns fine-tunes, quantisations and ONNX exports. */
Deno.test("model-search: the task filter is a first-class parameter", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [] }]);
  await action.execute({ pipelineTag: "automatic-speech-recognition", search: "whisper" }, ctx);
  assertEquals(
    new URL(calls[0].url).searchParams.get("pipeline_tag"),
    "automatic-speech-recognition",
  );
  assert(/TASK/.test(action.description!), action.description);
});

Deno.test("model-search: an unset filter is not sent as an empty parameter", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [] }]);
  await action.execute({ search: "", author: "", filter: "", pipelineTag: "" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("search"), null);
  assertEquals(url.searchParams.get("pipeline_tag"), null);
});

Deno.test("model-search: results carry ids and the gated count", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: [{ id: "openai-community/gpt2" }, { id: "meta-llama/Llama-3.1-8B", gated: "manual" }],
  }]);
  const result = await action.execute({ limit: 2 }, ctx) as Record<string, unknown>;
  assertEquals(result.ids, ["openai-community/gpt2", "meta-llama/Llama-3.1-8B"]);
  assertEquals(result.gatedCount, 1);
});

/** The limit is a page size and reads like a total. */
Deno.test("model-search: the limit hint says it is a page, not a total", () => {
  const limit = action.params!.find((p) => p.key === "limit")!;
  assert(/page size, not a total/.test(limit.hint!), limit.hint);
  assertEquals(action.type, "search");
});

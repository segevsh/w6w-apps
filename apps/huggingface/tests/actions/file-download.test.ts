import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/file-download.ts";

Deno.test("file-download: resolves a model file, with no kind prefix", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: '{"model_type":"gpt2"}' }]);
  await action.execute({ id: "openai-community/gpt2", path: "config.json" }, ctx);
  assertEquals(
    calls[0].url,
    "https://huggingface.co/openai-community/gpt2/resolve/main/config.json",
  );
  assertEquals(calls[0].headers["accept"], "*/*");
});

/** Datasets and Spaces carry a prefix in the resolve URL; models do not. */
Deno.test("file-download: datasets and Spaces are prefixed", async () => {
  const dataset = mockCtx([{ status: 200, body: "a,b" }]);
  await action.execute({ kind: "datasets", id: "d/s", path: "/data.csv" }, dataset.ctx);
  assertEquals(dataset.calls[0].url, "https://huggingface.co/datasets/d/s/resolve/main/data.csv");

  const space = mockCtx([{ status: 200, body: "print()" }]);
  await action.execute({ kind: "spaces", id: "a/demo", path: "app.py" }, space.ctx);
  assertEquals(space.calls[0].url, "https://huggingface.co/spaces/a/demo/resolve/main/app.py");
});

Deno.test("file-download: JSON is parsed as well as returned verbatim", async () => {
  const { ctx } = mockCtx([{ status: 200, body: '{"model_type":"gpt2"}' }]);
  const result = await action.execute({ id: "a/b", path: "config.json" }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(result.json, { model_type: "gpt2" });
  assertEquals(result.content, '{"model_type":"gpt2"}');
  assertEquals(result.size, 21);
});

/** Most files are not JSON, which is not an error. */
Deno.test("file-download: a non-JSON file comes back as text with no json field", async () => {
  const { ctx } = mockCtx([{ status: 200, body: "# A model card\n" }]);
  const result = await action.execute({ id: "a/b", path: "README.md" }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(result.json, undefined);
  assertEquals(result.content, "# A model card\n");
});

/** Weights are gigabytes and do not belong in a workflow's data. */
Deno.test("file-download: a file over the ceiling is refused, saying why", async () => {
  const { ctx } = mockCtx([{ status: 200, body: "x".repeat(2_000_001) }]);
  let message = "";
  try {
    await action.execute({ id: "a/b", path: "model.safetensors" }, ctx);
  } catch (err) {
    message = String(err);
  }
  assert(/2000001 bytes/.test(message), message);
  assert(/weights belong in a download/.test(message), message);
});

/** A gate is felt here and nowhere else, and no token can accept one. */
Deno.test("file-download: a gated repository 403s, and the error says a person must accept", async () => {
  const { ctx } = mockCtx([{ status: 403, body: { error: "Access to model is restricted" } }]);
  let message = "";
  try {
    await action.execute({ id: "meta-llama/Llama-3.1-8B", path: "config.json" }, ctx);
  } catch (err) {
    message = String(err);
  }
  assert(/not by any token/.test(message), message);
  assert(/GATED/.test(action.description!), action.description);
});

Deno.test("file-download: a revision is pinned into the path", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: "{}" }]);
  await action.execute({ id: "a/b", path: "config.json", revision: "e7da7f2" }, ctx);
  assertEquals(calls[0].url, "https://huggingface.co/a/b/resolve/e7da7f2/config.json");
});

Deno.test("file-download: a path is required and nothing is requested without one", async () => {
  const { ctx, calls } = mockCtx([]);
  let message = "";
  try {
    await action.execute({ id: "a/b" }, ctx);
  } catch (err) {
    message = String(err);
  }
  assert(/`path` is required/.test(message), message);
  assertEquals(calls.length, 0);
});

Deno.test("file-download: logs the path and size, never the contents", async () => {
  const { ctx, logs } = mockCtx([{ status: 200, body: "secret-ish" }]);
  await action.execute({ id: "a/b", path: "notes.txt" }, ctx);
  assertEquals(logs[0].data, { path: "notes.txt", size: 10 });
});

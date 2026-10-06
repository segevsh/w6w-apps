import { assertEquals, assertRejects } from "@std/assert";
import { jsonBody, mockCtx } from "../_helpers.ts";
import runTask from "../../actions/run-task.ts";

const HOST = "https://api.skyvern.com";

Deno.test("run-task: POSTs /v1/run/tasks with snake_case body and drops unset fields", async () => {
  const run = { run_id: "tsk_1", status: "created" };
  const { ctx, calls } = mockCtx([{ body: run }]);
  const out = await runTask.execute({
    prompt: "Find the top post",
    url: "https://news.ycombinator.com",
    engine: "skyvern-2.0",
    maxSteps: 10,
    proxyLocation: "RESIDENTIAL_GB",
    dataExtractionSchema: '{"type":"object"}',
    errorCodeMapping: { LOGIN: "login failed" },
    startFreshBrowser: false,
    fileIds: "f1, f2",
  }, ctx);
  assertEquals(out, run);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, `${HOST}/v1/run/tasks`);
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].headers["x-api-key"], undefined);
  assertEquals(jsonBody(calls[0]), {
    prompt: "Find the top post",
    url: "https://news.ycombinator.com",
    engine: "skyvern-2.0",
    max_steps: 10,
    proxy_location: "RESIDENTIAL_GB",
    data_extraction_schema: { type: "object" },
    error_code_mapping: { LOGIN: "login failed" },
    start_fresh_browser: false,
    file_ids: ["f1", "f2"],
  });
});

Deno.test("run-task: rejects a schema that is not JSON and surfaces the vendor error detail", async () => {
  const { ctx } = mockCtx();
  await assertRejects(
    async () => await runTask.execute({ prompt: "x", dataExtractionSchema: "{nope" }, ctx),
    Error,
    "Data extraction schema must be valid JSON",
  );
  const failing = mockCtx([{
    status: 422,
    body: { detail: [{ loc: ["body", "prompt"], msg: "Field required", type: "missing" }] },
  }]);
  await assertRejects(
    async () => await runTask.execute({ prompt: "" }, failing.ctx),
    Error,
    "prompt: Field required",
  );
});

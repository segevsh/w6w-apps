import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx, pathOf } from "../_helpers.ts";
import runGet from "../../actions/run-get.ts";

const HOST = "https://api.skyvern.com";

Deno.test("run-get: GETs /v1/runs/{id}, encoding the id", async () => {
  const run = { run_id: "wr_1", status: "completed", output: { a: 1 } };
  const { ctx, calls } = mockCtx([{ body: run }]);
  assertEquals(await runGet.execute({ runId: "wr_1" }, ctx), run);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, `${HOST}/v1/runs/wr_1`);

  const odd = mockCtx([{ body: run }]);
  await runGet.execute({ runId: "a/b" }, odd.ctx);
  assertEquals(pathOf(odd.calls[0].url), "/v1/runs/a%2Fb");
});

Deno.test("run-get: a 404 raises with Skyvern's detail", async () => {
  const { ctx } = mockCtx([{ status: 404, body: { detail: "Run not found" } }]);
  await assertRejects(async () => await runGet.execute({ runId: "x" }, ctx), Error, "Skyvern 404");
});

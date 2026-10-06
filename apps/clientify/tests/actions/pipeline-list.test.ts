import { assertEquals } from "@std/assert";
import pipelineList from "../../actions/pipeline-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("pipeline-list: GET /v1/deals/pipelines/", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: {
      count: 1,
      next: null,
      previous: null,
      results: [{ id: 17, name: "Default", stages: [] }],
    },
  }]);
  const result = await pipelineList.execute({}, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/deals/pipelines/");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body, null);
  assertEquals(result, {
    count: 1,
    next: null,
    previous: null,
    results: [{ id: 17, name: "Default", stages: [] }],
  });
});

Deno.test("pipeline-list: declares type read", () => {
  assertEquals(pipelineList.type, "read");
});

Deno.test("pipeline-list: surfaces the vendor error body", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { detail: "Not found." } }]);
  let message = "";
  try {
    await pipelineList.execute({}, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message.includes("Not found."), true);
  assertEquals(message.includes("400"), true);
});

import { assertEquals } from "@std/assert";

import listDealPipelines from "../../actions/list-deal-pipelines.ts";
import { API_ROOT, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("list-deal-pipelines: GET /deal_pipelines with only page and limit", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ _id: "p1" }] }]);

  await listDealPipelines.execute({ page: 1, limit: 200 }, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, `${API_ROOT}/deal_pipelines?page=1&limit=200`);
  assertEquals(pathOf(calls[0].url), "/api/v1/deal_pipelines");
  assertEquals(queryOf(calls[0].url), { page: "1", limit: "200" });
});

Deno.test("list-deal-pipelines: the bare array response is passed through, not wrapped", async () => {
  const pipelines = [{ _id: "p1", name: "Default" }];
  const { ctx } = mockCtx([{ body: pipelines }]);

  assertEquals(await listDealPipelines.execute({}, ctx), pipelines);
});

Deno.test("list-deal-pipelines: it is a read action with no required params", () => {
  assertEquals(listDealPipelines.type, "read");
  assertEquals(listDealPipelines.params?.some((p) => p.required), false);
});

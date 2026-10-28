import { assert, assertEquals, assertThrows } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-dataset-quality.ts";

Deno.test("get-dataset-quality: GETs the top-level edge with dataset_id as a query param", async () => {
  const { ctx, calls } = mockCtx([
    { body: { web: [{ event_name: "Purchase", event_match_quality: 7.6 }] } },
  ]);
  const result = await action.execute({}, ctx);

  assertEquals(calls[0].method, "GET");
  const url = new URL(calls[0].url);
  // Note the shape: /dataset_quality?dataset_id=…, NOT /{id}/quality.
  assertEquals(url.pathname, "/v25.0/dataset_quality");
  assertEquals(url.searchParams.get("dataset_id"), "1234567890");
  assertEquals(url.searchParams.get("agent_name"), null);
  assertEquals((result.web as unknown[]).length, 1);
});

Deno.test("get-dataset-quality: passes the partner agent name when given", async () => {
  const { ctx, calls } = mockCtx([{ body: { web: [] } }]);
  await action.execute({ datasetId: "42", agentName: "acme" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("dataset_id"), "42");
  assertEquals(url.searchParams.get("agent_name"), "acme");
});

Deno.test("get-dataset-quality: fails when the connection carries no dataset and none is given", () => {
  const { ctx, calls } = mockCtx([], { dataset: null, auth: "oauth2" });
  assertThrows(() => action.execute({}, ctx), Error, "No dataset (pixel) id");
  assertEquals(calls.length, 0);
});

Deno.test("get-dataset-quality: omits authorization (the runtime injects it)", async () => {
  const { ctx, calls } = mockCtx([{ body: { web: [] } }]);
  await action.execute({}, ctx);
  assert(!("authorization" in calls[0].headers));
});

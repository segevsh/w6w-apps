import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/segment-list.ts";

const conn = { display: { projectKey: "default", environmentKey: "production" } };

/** Segments are per environment, so the environment is in the path. */
Deno.test("segment-list: reads an environment's segments", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { items: [{ key: "beta" }] } }], conn);
  assertEquals(await action.execute!({}, ctx), [{ key: "beta" }]);
  assertEquals(new URL(calls[0].url).pathname, "/api/v2/segments/default/production");
});

Deno.test("segment-list: the environment override changes the path", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { items: [] } }], conn);
  await action.execute!({ environmentKey: "staging" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/v2/segments/default/staging");
  assert(action.description!.includes("reusable audiences"), action.description);
});

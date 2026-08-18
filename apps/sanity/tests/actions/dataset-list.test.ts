import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/dataset-list.ts";

const conn = { display: { projectId: "abc123", dataset: "production" } };

Deno.test("dataset-list: asks the management API for this project's datasets", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [{ name: "production" }] }], conn);
  await action.execute!({}, ctx);
  assertEquals(new URL(calls[0].url).host, "api.sanity.io");
  assertEquals(new URL(calls[0].url).pathname, "/v2025-02-19/projects/abc123/datasets");
});

/** Pointing at the wrong dataset returns nothing rather than failing. */
Deno.test("dataset-list: says datasets share no documents", () => {
  assert(/share no documents/.test(action.description!), action.description);
});

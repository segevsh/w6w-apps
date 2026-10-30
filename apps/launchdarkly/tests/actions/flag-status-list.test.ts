import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/flag-status-list.ts";

const conn = { display: { projectKey: "default", environmentKey: "production" } };

/** Unpaged — the response is the whole set for the environment. */
test("flag-status-list: unwraps items in one unpaged call", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { items: [{ name: "inactive" }] } }], conn);
  assertEquals(await action.execute!({}, ctx), [{ name: "inactive" }]);
  assertEquals(calls.length, 1);
  assertEquals(new URL(calls[0].url).searchParams.get("limit"), null);
  assert(action.description!.includes("flag-cleanup report"), action.description);
});

test("flag-status-list: an absent items array reads as empty", async () => {
  const { ctx } = mockCtx([{ status: 200, body: {} }], conn);
  assertEquals(await action.execute!({}, ctx), []);
});

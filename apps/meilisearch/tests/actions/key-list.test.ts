import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/key-list.ts";

const conn = { display: { baseUrl: "https://search.example.com" } };

/** How a 403 on a working key is diagnosed: the key is scoped. */
test("key-list: reads the keys and their scopes", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { results: [{ name: "search", actions: ["search"], indexes: ["movies"] }] },
  }], conn);
  const result = await action.execute!({}, ctx) as Array<Record<string, unknown>>;
  assertEquals(new URL(calls[0].url).pathname, "/keys");
  assertEquals(result[0].actions, ["search"]);
  assert(action.description!.includes("scoped to"), action.description);
});

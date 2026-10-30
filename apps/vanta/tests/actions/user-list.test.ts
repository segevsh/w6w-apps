import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import { display, page } from "./_shared.ts";
import action from "../../actions/user-list.ts";

test("user-list: reads the people with a Vanta login", async () => {
  const { ctx, calls } = mockCtx([page([{ id: "u1" }])], { display });
  const result = await action.execute!({}, ctx) as { count: number };
  assertEquals(calls[0].url.split("?")[0], "https://api.vanta.com/v1/users");
  assertEquals(result.count, 1);
});

test("user-list: logs a count, not the roster", async () => {
  const { ctx, logs } = mockCtx([page([{ id: "u1", email: "ada@acme.com" }])], { display });
  await action.execute!({}, ctx);
  assert(!JSON.stringify(logs).includes("ada@acme.com"), JSON.stringify(logs));
  assertEquals(logs[0].data, { count: 1 });
});

/** Every ownership field in the API takes an id from here. */
test("user-list: says it is the source for ownership ids", () => {
  assert(/ownership field/.test(action.description!), action.description);
});

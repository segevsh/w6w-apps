import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/component-group-list.ts";

const conn = { display: { pageId: "pg1" } };

/** Underscore, not hyphen — the wrong one 404s. */
Deno.test("component-group-list: uses the underscored path", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [] }], conn);
  await action.execute!({}, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1/pages/pg1/component_groups");
});

Deno.test("component-group-list: says a group's status is derived", () => {
  assert(/derived/.test(action.description!), action.description);
});

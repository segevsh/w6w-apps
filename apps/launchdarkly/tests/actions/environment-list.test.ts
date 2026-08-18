import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/environment-list.ts";

const conn = { display: { projectKey: "default" } };

/** `production` is a convention, not a guarantee. */
Deno.test("environment-list: reads a project's environments", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { items: [{ key: "production" }] } }], conn);
  assertEquals(await action.execute!({}, ctx), [{ key: "production" }]);
  assertEquals(new URL(calls[0].url).pathname, "/api/v2/projects/default/environments");
  assert(action.description!.includes("flag toggles act on"), action.description);
});

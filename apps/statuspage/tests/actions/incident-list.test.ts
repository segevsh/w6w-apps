import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/incident-list.ts";

const conn = { display: { pageId: "pg1" } };

/** The default answers "is something already open". */
Deno.test("incident-list: defaults to the unresolved collection", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [] }], conn);
  await action.execute!({}, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1/pages/pg1/incidents/unresolved");
});

Deno.test("incident-list: the other scopes are different paths", async () => {
  const all = mockCtx([{ status: 200, body: [] }], conn);
  await action.execute!({ scope: "" }, all.ctx);
  assertEquals(new URL(all.calls[0].url).pathname, "/v1/pages/pg1/incidents");

  const scheduled = mockCtx([{ status: 200, body: [] }], conn);
  await action.execute!({ scope: "scheduled" }, scheduled.ctx);
  assertEquals(new URL(scheduled.calls[0].url).pathname, "/v1/pages/pg1/incidents/scheduled");
});

Deno.test("incident-list: says it prevents duplicate incidents", () => {
  assert(/duplicate/.test(action.description!), action.description);
});

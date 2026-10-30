import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockNocrmCtx } from "../_helpers.ts";
import action from "../../actions/lead-log-activity.ts";

test("lead-log-activity: GETs the Simplified API route with all three params", async () => {
  const { ctx, calls } = mockNocrmCtx([{ body: { id: 503, content: "Demo" } }]);
  await action.execute({ leadId: "145676", activityId: "45", userId: "35", content: "Demo" }, ctx);
  assertEquals(
    calls[0].url,
    "https://acme.nocrm.io/api/simple/leads/145676/add_activity?activity_id=45&user_id=35&content=Demo",
  );
  assertEquals(calls[0].method, "GET");
});

test("lead-log-activity: content is optional, as the parameter table says", async () => {
  const { ctx, calls } = mockNocrmCtx([{ body: {} }]);
  await action.execute({ leadId: "145676", activityId: "45", userId: "35" }, ctx);
  assertEquals(
    calls[0].url,
    "https://acme.nocrm.io/api/simple/leads/145676/add_activity?activity_id=45&user_id=35",
  );
});

test("lead-log-activity: a missing required parameter is reported from the body", async () => {
  const { ctx } = mockNocrmCtx([{
    status: 422,
    body: { error: 422, message: "activity_id is missing", type: "missing_parameter" },
  }]);
  await assertRejects(
    () => Promise.resolve(action.execute({ leadId: "1", activityId: "", userId: "2" }, ctx)),
    Error,
    "missing_parameter",
  );
});

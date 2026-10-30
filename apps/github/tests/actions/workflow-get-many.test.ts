import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/workflow-get-many.ts";

test("workflow-get-many: GETs the workflows route", async () => {
  const { ctx, calls } = mockCtx([{ body: { total_count: 0, workflows: [] } }]);
  await action.execute({ owner: "acme", repository: "api" }, ctx);
  assertEquals(
    new URL(calls[0].url).pathname,
    "/repos/acme/api/actions/workflows",
  );
});

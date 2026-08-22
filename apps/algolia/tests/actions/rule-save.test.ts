import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/rule-save.ts";

const display = { appId: "APPID" };

/** Algolia takes the objectID in both path and body; they must not disagree. */
Deno.test("rule-save: sets the objectID in the body from the field", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { taskID: 1 } }], { display });
  await action.execute!({
    indexName: "products",
    objectID: "r1",
    rule: '{"objectID":"stale","conditions":[{"pattern":"shoes"}],"consequence":{}}',
  }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.objectID, "r1");
  assertEquals(body.conditions, [{ pattern: "shoes" }]);
});

Deno.test("rule-save: the rule body is required", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ indexName: "p", objectID: "r1" }, ctx),
    Error,
    "`rule`",
  );
  assertEquals(calls.length, 0);
});

import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, ok } from "./_shared.ts";
import action from "../../actions/entity-tag-add.ts";

const applied = ok({ taggingAddTagsToEntity: { errors: [] } });

Deno.test("entity-tag-add: sends the key with its list of values", async () => {
  const { ctx, calls } = mockCtx([applied], { display });
  const result = await action.execute!({
    guid: "g1",
    key: "team",
    values: "platform, sre",
  }, ctx) as { values: string[] };
  const variables = JSON.parse(calls[0].body!).variables;
  assertEquals(variables.guid, "g1");
  assertEquals(variables.tags, [{ key: "team", values: ["platform", "sre"] }]);
  assertEquals(result.values, ["platform", "sre"]);
});

/**
 * The third error level: HTTP 200, no GraphQL errors, and the mutation still
 * failed — reported inside `data`.
 */
Deno.test("entity-tag-add: a mutation-payload error throws, and says where it came from", async () => {
  const { ctx } = mockCtx([
    ok({ taggingAddTagsToEntity: { errors: [{ message: "no such entity", type: "NOT_FOUND" }] } }),
  ], { display });
  const error = await assertRejects(
    async () => await action.execute!({ guid: "gone", key: "team", values: "x" }, ctx),
    Error,
  );
  assert(/no such entity/.test(error.message), error.message);
  assert(/HTTP 200 with no GraphQL errors/.test(error.message), error.message);
});

Deno.test("entity-tag-add: needs a guid, a key and values", async () => {
  for (
    const input of [{ key: "t", values: "v" }, { guid: "g", values: "v" }, { guid: "g", key: "t" }]
  ) {
    const { ctx, calls } = mockCtx([], { display });
    await assertRejects(async () => await action.execute!(input, ctx), Error, "is required");
    assertEquals(calls.length, 0);
  }
});

Deno.test("entity-tag-add: logs the key and how many values, never the values", async () => {
  const { ctx, logs } = mockCtx([applied], { display });
  await action.execute!({ guid: "g1", key: "owner", values: "ada@example.com" }, ctx);
  assert(!JSON.stringify(logs).includes("ada@"), JSON.stringify(logs));
  assertEquals(logs[0].data, { key: "owner", valueCount: 1 });
});

/** Adding appends; replacing is a different mutation, deliberately not wrapped. */
Deno.test("entity-tag-add: says adding appends rather than replaces", () => {
  assert(/APPENDS rather than replacing/.test(action.description!), action.description);
  assertEquals(action.idempotent, true);
});

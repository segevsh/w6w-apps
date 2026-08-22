import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/user-group-member-list.ts";

const display = { display: { region: "us" } };

/**
 * `members` is direct edges; `membership` resolves nesting and dynamic queries.
 * For "who can reach this?", the first under-reports without saying so.
 */
Deno.test("user-group-member-list: defaults to effective membership", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [{ id: "u1" }] }], display);
  const result = await action.execute!({ groupId: "g1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/v2/usergroups/g1/membership");
  assertEquals(result, [{ id: "u1" }]);
});

Deno.test("user-group-member-list: direct membership is the other endpoint", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [] }], display);
  await action.execute!({ groupId: "g1", resolution: "members" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/v2/usergroups/g1/members");
});

Deno.test("user-group-member-list: anything unrecognised resolves to the safe one", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [] }], display);
  await action.execute!({ groupId: "g1", resolution: "nonsense" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/v2/usergroups/g1/membership");
});

Deno.test("user-group-member-list: the option labels say which one under-reports", () => {
  const options = (action.params as Array<{ key: string; options?: unknown }>)
    .find((p) => p.key === "resolution")!.options as Array<{ value: string; label: string }>;
  assertEquals(options[0].value, "membership");
  assert(options[0].label.includes("nesting"), options[0].label);
});

Deno.test("user-group-member-list: a blank id fails before any request", async () => {
  const { ctx, calls } = mockCtx([], display);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`groupId`");
  assertEquals(calls.length, 0);
});

import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/setup-space.ts";

test("setup-space: POSTs the custom /v1/spaces:setup verb", async () => {
  const { ctx, calls } = mockCtx([{ body: { name: "spaces/A1" } }]);
  await action.execute!({ spaceType: "SPACE", displayName: "Launch" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/v1/spaces:setup");
});

test("setup-space: wraps the space fields under `space`", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ spaceType: "SPACE", displayName: "L", description: "d" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).space, {
    spaceType: "SPACE",
    displayName: "L",
    spaceDetails: { description: "d" },
  });
});

test("setup-space: turns member ids into users/{user} membership objects", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ spaceType: "GROUP_CHAT", members: ["123", "users/456"] }, ctx);
  assertEquals(JSON.parse(calls[0].body!).memberships, [
    { member: { name: "users/123", type: "HUMAN" } },
    { member: { name: "users/456", type: "HUMAN" } },
  ]);
});

test("setup-space: omits memberships entirely when none are given", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ spaceType: "SPACE", displayName: "L", members: [] }, ctx);
  assertEquals("memberships" in JSON.parse(calls[0].body!), false);
});

test("setup-space: a DIRECT_MESSAGE carries one membership and no display name", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ spaceType: "DIRECT_MESSAGE", members: ["123"] }, ctx);
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.space, { spaceType: "DIRECT_MESSAGE" });
  assertEquals(sent.memberships.length, 1);
});

test("setup-space: carries requestId in the BODY, not the query string", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  const withInvocation = { ...ctx, invocation: { invocationId: "inv-7" } };
  await action.execute!({ spaceType: "SPACE", displayName: "L" }, withInvocation as typeof ctx);
  assertEquals(JSON.parse(calls[0].body!).requestId, "inv-7");
  assertEquals(new URL(calls[0].url).searchParams.has("requestId"), false);
});

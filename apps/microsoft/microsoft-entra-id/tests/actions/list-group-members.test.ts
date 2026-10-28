import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-group-members.ts";

Deno.test("list-group-members: GETs /groups/{id}/members", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [{ id: "u1" }] } }]);
  const out = await action.execute({ groupId: "g1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/groups/g1/members");
  assertEquals(calls[0].headers.consistencylevel, undefined);
  assertEquals(out.value.length, 1);
});

Deno.test("list-group-members: a member type adds the OData cast and switches advanced on", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [] } }]);
  await action.execute({ groupId: "g1", memberType: "user" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/groups/g1/members/microsoft.graph.user");
  assertEquals(calls[0].headers.consistencylevel, "eventual");
  assertEquals(new URL(calls[0].url).searchParams.get("$count"), "true");
});

Deno.test("list-group-members: 'all' means no cast", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [] } }]);
  await action.execute({ groupId: "g1", memberType: "all" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/groups/g1/members");
});

Deno.test("list-group-members: an unsupported cast is Graph's 400 Request_UnsupportedQuery", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: { error: { code: "Request_UnsupportedQuery", message: "unsupported" } },
  }]);
  await assertRejects(
    async () => await action.execute({ groupId: "g1", memberType: "group" }, ctx),
    Error,
    "Request_UnsupportedQuery",
  );
});

Deno.test("list-group-members: offers no $orderby (the reference does not list it)", () => {
  assert(!action.params!.some((p) => p.key === "orderby"));
});

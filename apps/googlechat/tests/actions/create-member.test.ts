import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/create-member.ts";

Deno.test("create-member: POSTs a HUMAN member under spaces/{space}/members", async () => {
  const { ctx, calls } = mockCtx([{ body: { name: "spaces/A1/members/M1" } }]);
  await action.execute!({ space: "A1", user: "123456789" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/v1/spaces/A1/members");
  assertEquals(JSON.parse(calls[0].body!), {
    member: { name: "users/123456789", type: "HUMAN" },
  });
});

Deno.test("create-member: accepts an already-qualified users/{user} name", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ space: "A1", user: "users/123" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).member.name, "users/123");
});

Deno.test("create-member: sends a Google Group as groupMember, not member", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ space: "A1", group: "groups/G1" }, ctx);
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.groupMember, { name: "groups/G1" });
  assertEquals("member" in sent, false);
});

Deno.test("create-member: includes the role when given", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ space: "A1", user: "123", role: "ROLE_MANAGER" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).role, "ROLE_MANAGER");
});

Deno.test("create-member: refuses a request naming neither a user nor a group", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    async () => await action.execute!({ space: "A1" }, ctx),
    Error,
    "either a user or a Google Group",
  );
  assertEquals(calls.length, 0);
});

Deno.test("create-member: refuses a request naming both a user and a group", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    async () => await action.execute!({ space: "A1", user: "123", group: "groups/G" }, ctx),
    Error,
    "never both",
  );
  assertEquals(calls.length, 0);
});

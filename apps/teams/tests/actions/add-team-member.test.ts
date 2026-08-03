import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/add-team-member.ts";

Deno.test("add-team-member: POSTs the aadUserConversationMember binding", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "m1", userId: "u1" } }]);
  const out = await action.execute({ teamId: "t1", user: "8b081ef6-4792" }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/teams/t1/members");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body["@odata.type"], "#microsoft.graph.aadUserConversationMember");
  assertEquals(
    body["user@odata.bind"],
    "https://graph.microsoft.com/v1.0/users('8b081ef6-4792')",
  );
  assertEquals(out.id, "m1");
});

Deno.test("add-team-member: a plain member gets an empty roles array, as documented", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }]);
  await action.execute({ teamId: "t1", user: "u1", role: "member" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).roles, []);
});

Deno.test("add-team-member: an owner gets roles: ['owner']", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }]);
  await action.execute({ teamId: "t1", user: "u1", role: "owner" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).roles, ["owner"]);
});

Deno.test("add-team-member: defaults to member when no role is given", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }]);
  await action.execute({ teamId: "t1", user: "u1" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).roles, []);
});

Deno.test("add-team-member: accepts a UPN as well as an object id", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }]);
  await action.execute({ teamId: "t1", user: "jacob@contoso.com" }, ctx);
  assertEquals(
    JSON.parse(calls[0].body!)["user@odata.bind"],
    "https://graph.microsoft.com/v1.0/users('jacob@contoso.com')",
  );
});

Deno.test("add-team-member: escapes a quote so it cannot break out of the OData literal", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }]);
  await action.execute({ teamId: "t1", user: "o'brien@contoso.com" }, ctx);
  assertEquals(
    JSON.parse(calls[0].body!)["user@odata.bind"],
    "https://graph.microsoft.com/v1.0/users('o''brien@contoso.com')",
  );
});

Deno.test("add-team-member: rejects an empty user locally, before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  const err = await assertRejects(async () =>
    await action.execute({ teamId: "t1", user: "  " }, ctx)
  );
  assert((err as Error).message.startsWith("Microsoft Teams:"));
  assertEquals(calls.length, 0);
});

Deno.test("add-team-member: is honestly non-idempotent — Graph has no dedupe key here", () => {
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, false);
});

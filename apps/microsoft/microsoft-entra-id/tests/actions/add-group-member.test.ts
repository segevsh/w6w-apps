import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/add-group-member.ts";

Deno.test("add-group-member: POSTs the directoryObjects reference to /members/$ref", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await action.execute({ groupId: "g1", memberId: "u1" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/groups/g1/members/$ref");
  assertEquals(JSON.parse(calls[0].body!), {
    "@odata.id": "https://graph.microsoft.com/v1.0/directoryObjects/u1",
  });
  assertEquals(out, { added: true, groupId: "g1", memberId: "u1" });
});

Deno.test("add-group-member: an existing member is Graph's 400, surfaced", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: { error: { code: "Request_BadRequest", message: "already exist" } },
  }]);
  await assertRejects(
    async () => await action.execute({ groupId: "g1", memberId: "u1" }, ctx),
    Error,
    "Request_BadRequest",
  );
});

Deno.test("add-group-member: requires a member and is not idempotent", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await action.execute({ groupId: "g1", memberId: " " }, ctx),
    Error,
    "required",
  );
  assertEquals(calls.length, 0);
  assertEquals(action.idempotent, false);
});

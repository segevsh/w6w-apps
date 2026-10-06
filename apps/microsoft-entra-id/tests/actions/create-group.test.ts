import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/create-group.ts";

Deno.test("create-group: a security group is groupTypes [], mailEnabled false, securityEnabled true", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "g1" } }]);
  const out = await action.execute({ displayName: "Ops", mailNickname: "ops" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/groups");
  assertEquals(JSON.parse(calls[0].body!), {
    displayName: "Ops",
    mailNickname: "ops",
    groupTypes: [],
    mailEnabled: false,
    securityEnabled: true,
  });
  assertEquals(out.id, "g1");
});

Deno.test("create-group: a Microsoft 365 group is Unified, mail enabled, not security", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }]);
  await action.execute({
    displayName: "Library",
    mailNickname: "library",
    groupType: "microsoft365",
    description: "Self help",
    visibility: "Private",
  }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.groupTypes, ["Unified"]);
  assertEquals(body.mailEnabled, true);
  assertEquals(body.securityEnabled, false);
  assertEquals(body.visibility, "Private");
  assertEquals(body.description, "Self help");
});

Deno.test("create-group: owners and members become @odata.bind user references", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }]);
  await action.execute({
    displayName: "Ops",
    mailNickname: "ops",
    ownerIds: ["o1"],
    memberIds: ["m1", " m2 "],
  }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body["owners@odata.bind"], ["https://graph.microsoft.com/v1.0/users/o1"]);
  assertEquals(body["members@odata.bind"], [
    "https://graph.microsoft.com/v1.0/users/m1",
    "https://graph.microsoft.com/v1.0/users/m2",
  ]);
});

Deno.test("create-group: omits the bind arrays when there are none", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }]);
  await action.execute({ displayName: "Ops", mailNickname: "ops" }, ctx);
  const body = JSON.parse(calls[0].body!);
  assert(!("owners@odata.bind" in body));
  assert(!("members@odata.bind" in body));
});

Deno.test("create-group: refuses more than 20 owners+members before calling Graph", async () => {
  const { ctx, calls } = mockCtx([]);
  const ids = Array.from({ length: 21 }, (_, i) => `u${i}`);
  await assertRejects(
    async () =>
      await action.execute({ displayName: "Ops", mailNickname: "ops", memberIds: ids }, ctx),
    Error,
    "at most 20",
  );
  assertEquals(calls.length, 0);
});

Deno.test("create-group: requires a display name and a mail nickname", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(
    async () => await action.execute({ displayName: "", mailNickname: "x" }, ctx),
    Error,
    "Display name is required",
  );
  await assertRejects(
    async () => await action.execute({ displayName: "x", mailNickname: " " }, ctx),
    Error,
    "Mail nickname is required",
  );
});

Deno.test("create-group: additionalProperties can add what the form does not model", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }]);
  await action.execute({
    displayName: "Dyn",
    mailNickname: "dyn",
    additionalProperties: { membershipRule: "user.city -eq 'X'" },
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!).membershipRule, "user.city -eq 'X'");
});

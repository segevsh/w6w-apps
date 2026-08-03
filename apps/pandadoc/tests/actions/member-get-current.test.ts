import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx, pathOf } from "../_helpers.ts";
import action from "../../actions/member-get-current.ts";

Deno.test("member-get-current: GETs /members/current", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      user_id: "u1",
      membership_id: "m1",
      email: "a@b.com",
      workspace: "w1",
      workspace_name: "Acme",
      role: "admin",
      user_license: "Full",
      is_active: true,
    },
  }]);
  const out = await action.execute({}, ctx) as { membership_id: string };

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0]), "/public/v1/members/current");
  assertEquals(new URL(calls[0].url).search, "");
  // membership_id is what Create Document's `owner` and Send's `sender` take.
  assertEquals(out.membership_id, "m1");
});

Deno.test("member-get-current: a rejected key surfaces PandaDoc's envelope", async () => {
  const { ctx } = mockCtx([
    { status: 401, body: { type: "authentication_error", detail: "Invalid key." } },
  ]);
  const err = await assertRejects(async () => {
    await action.execute({}, ctx);
  }, Error);
  assertEquals(
    err.message,
    "PandaDoc 401 for GET /public/v1/members/current: authentication_error: Invalid key.",
  );
});

Deno.test("member-get-current: takes no params and is a read", () => {
  assertEquals(action.params, []);
  assertEquals(action.type, "read");
  assertEquals(action.resource, "member");
});

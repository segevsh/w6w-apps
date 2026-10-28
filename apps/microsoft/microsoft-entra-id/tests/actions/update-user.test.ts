import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/update-user.ts";

Deno.test("update-user: PATCHes only the fields that were set and reports success on 204", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await action.execute({ userId: "u1", jobTitle: "Lead", accountEnabled: false }, ctx);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/users/u1");
  assertEquals(JSON.parse(calls[0].body!), { jobTitle: "Lead", accountEnabled: false });
  assertEquals(out, { updated: true, userId: "u1" });
});

Deno.test("update-user: accountEnabled=false is sent, not dropped as empty", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  await action.execute({ userId: "u1", accountEnabled: false }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { accountEnabled: false });
});

Deno.test("update-user: additionalProperties override named fields", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  await action.execute(
    { userId: "u1", jobTitle: "A", additionalProperties: { jobTitle: "B" } },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!), { jobTitle: "B" });
});

Deno.test("update-user: refuses an empty update without calling Graph", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await action.execute({ userId: "u1" }, ctx),
    Error,
    "at least one property",
  );
  assertEquals(calls.length, 0);
});

Deno.test("update-user: a 403 surfaces Graph's code", async () => {
  const { ctx } = mockCtx([{
    status: 403,
    body: { error: { code: "Authorization_RequestDenied", message: "Insufficient privileges" } },
  }]);
  await assertRejects(
    async () => await action.execute({ userId: "u1", city: "X" }, ctx),
    Error,
    "Authorization_RequestDenied",
  );
});

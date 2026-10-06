import { assert, assertEquals, assertRejects } from "@std/assert";
import { connected, mockCtx } from "../_helpers.ts";
import action from "../../actions/add-account-member.ts";

Deno.test("add-account-member: identity", () => {
  assertEquals(action.key, "add-account-member");
  assertEquals(action.type, "perform");
  assertEquals(action.resource, "account");
  assertEquals(action.idempotent, false);
});

Deno.test("add-account-member: sends POST /api/v1/crm/accounts/acc1/memberships", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { Uid: "x1" } }]);
  const result = await action.execute({
    accountUid: "acc1",
    personUid: "p1",
    isPrimary: true,
    sendWelcomeEmail: false,
  } as never, connected(ctx));
  assertEquals(calls.length, 1);
  const url = new URL(calls[0].url);
  assertEquals(url.host, "acme.outseta.com");
  assertEquals(calls[0].method, "POST");
  assertEquals(url.pathname, "/api/v1/crm/accounts/acc1/memberships");
  assertEquals(url.searchParams.get("sendWelcomeEmail"), "false");
  assertEquals(JSON.parse(calls[0].body ?? "null"), {
    Person: {
      Uid: "p1",
    },
    IsPrimary: true,
  });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals((result as { Uid: string }).Uid, "x1");
  // The credential is the auth hook's job — no action writes it.
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("add-account-member: a failure names the status and the request", async () => {
  const { ctx } = mockCtx([{ status: 404 }]);
  const err = await assertRejects(async () => {
    await action.execute({
      accountUid: "acc1",
      personUid: "p1",
      isPrimary: true,
      sendWelcomeEmail: false,
    } as never, connected(ctx));
  });
  assert((err as Error).message.includes("404"));
  assert((err as Error).message.includes("/api/v1/crm/accounts/acc1/memberships"));
});

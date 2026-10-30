import { test } from "node:test";
import { assert, assertEquals, assertRejects } from "../_assert.ts";
import { connected, mockCtx } from "../_helpers.ts";
import action from "../../actions/create-account.ts";

test("create-account: identity", () => {
  assertEquals(action.key, "create-account");
  assertEquals(action.type, "perform");
  assertEquals(action.resource, "account");
  assertEquals(action.idempotent, false);
});

test("create-account: sends POST /api/v1/crm/accounts", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { Uid: "x1" } }]);
  const result = await action.execute({
    name: "Acme",
    primaryPersonUid: "p1",
  } as never, connected(ctx));
  assertEquals(calls.length, 1);
  const url = new URL(calls[0].url);
  assertEquals(url.host, "acme.outseta.com");
  assertEquals(calls[0].method, "POST");
  assertEquals(url.pathname, "/api/v1/crm/accounts");
  assertEquals(JSON.parse(calls[0].body ?? "null"), {
    Name: "Acme",
    PersonAccount: [
      {
        Person: {
          Uid: "p1",
        },
        IsPrimary: true,
      },
    ],
  });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals((result as { Uid: string }).Uid, "x1");
  // The credential is the auth hook's job — no action writes it.
  assertEquals(calls[0].headers["authorization"], undefined);
});

test("create-account: a failure names the status and the request", async () => {
  const { ctx } = mockCtx([{ status: 404 }]);
  const err = await assertRejects(async () => {
    await action.execute({
      name: "Acme",
      primaryPersonUid: "p1",
    } as never, connected(ctx));
  });
  assert((err as Error).message.includes("404"));
  assert((err as Error).message.includes("/api/v1/crm/accounts"));
});

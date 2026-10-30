import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/account-get.ts";

test("account-get: takes no parameters and asks one cheap question", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { account: { id: "a1", name: "Acme" } } } }]);
  const out = await action.execute({}, ctx);
  assertEquals(action.params, []);
  assertEquals(JSON.parse(calls[0].body!).variables, {});
  assertEquals(out, { account: { id: "a1", name: "Acme" } });
});

test("account-get: is promoted into the health surface as a credential probe", () => {
  assertEquals(action.healthCheck?.kind, "credential");
  assertEquals(action.type, "read");
});

test("account-get: an unauthenticated 200 still fails", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: {
      errors: [{
        message: "hidden because you are unauthenticated",
        extensions: { code: "UNAUTHENTICATED" },
      }],
      data: { account: null },
    },
  }]);
  await assertRejects(async () => await action.execute({}, ctx), Error, "unauthenticated");
});

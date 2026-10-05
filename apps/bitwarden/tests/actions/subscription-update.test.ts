import { assertEquals, assertMatch, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/subscription-update.ts";

const D = { display: { region: "us" } };

Deno.test("subscription-update: sends only the set fields, grouped by product", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: "" }], D);
  await action.execute({ pmSeats: 60, smServiceAccounts: 10 }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(JSON.parse(calls[0].body!), {
    passwordManager: { seats: 60 },
    secretsManager: { serviceAccounts: 10 },
  });
});

Deno.test("subscription-update: refuses an empty update", async () => {
  const { ctx } = mockCtx([], D);
  const err = await assertRejects(async () => await action.execute({}, ctx));
  assertMatch((err as Error).message, /at least one/);
});

Deno.test("subscription-update: refuses a negative number", async () => {
  const { ctx } = mockCtx([], D);
  const err = await assertRejects(async () => await action.execute({ pmSeats: -1 }, ctx));
  assertMatch((err as Error).message, /non-negative/);
});

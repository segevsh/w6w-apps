import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockWorkableCtx } from "../_helpers.ts";
import action from "../../actions/candidate-update.ts";

test("candidate-update: PATCHes /candidates/:id with only the fields set", async () => {
  const { ctx, calls } = mockWorkableCtx([{ body: { candidate: { id: "c1" } } }]);
  await action.execute({ id: "c1", email: "new@example.com" }, ctx);
  assertEquals(calls[0].url, "https://acme.workable.com/spi/v3/candidates/c1");
  assertEquals(calls[0].method, "PATCH");
  assertEquals(JSON.parse(calls[0].body!), { candidate: { email: "new@example.com" } });
});

test("candidate-update: an untouched field is omitted, not sent as null or empty", async () => {
  const { ctx, calls } = mockWorkableCtx([{ body: {} }]);
  await action.execute({ id: "c1", firstname: "Jo" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).candidate, { firstname: "Jo" });
});

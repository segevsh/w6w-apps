import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/subscriber-update.ts";

Deno.test("subscriber-update: PUTs only the keys given", async () => {
  const { ctx, calls } = mockCtx([{ body: [true] }]);
  const out = await action.execute({ subscriberId: "42", newEmail: "n@example.com" }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(calls[0].url, "https://api.klicktipp.com/subscriber/42");
  assertEquals(JSON.parse(calls[0].body!), { newemail: "n@example.com" });
  assertEquals(out, { success: true });
});

Deno.test("subscriber-update: refuses an empty update", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await action.execute({ subscriberId: "42" }, ctx),
    Error,
    "at least one",
  );
  assertEquals(calls.length, 0);
});

Deno.test("subscriber-update: error 10 carries its subcode", async () => {
  const { ctx } = mockCtx([{ status: 406, body: { error: 10, code: 9 } }]);
  await assertRejects(
    async () => await action.execute({ subscriberId: "42", newSmsNumber: "+49170" }, ctx),
    Error,
    "already assigned to another contact",
  );
});

Deno.test("subscriber-update: a 200 that is not [true] is a failure", async () => {
  const { ctx } = mockCtx([{ body: [false] }]);
  await assertRejects(
    async () => await action.execute({ subscriberId: "42", newEmail: "n@example.com" }, ctx),
    Error,
    "did not confirm",
  );
});

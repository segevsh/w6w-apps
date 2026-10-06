import { assertEquals, assertRejects } from "@std/assert";
import { mockPardotCtx } from "../_helpers.ts";
import action from "../../actions/prospect-update.ts";

Deno.test("prospect-update: PATCHes only the fields that were set", async () => {
  const { ctx, calls } = mockPardotCtx([{ body: { id: 9, firstName: "Bo" } }]);
  const out = await action.execute({ prospectId: 9, firstName: "Bo" }, ctx);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(new URL(calls[0].url).pathname, "/api/v5/objects/prospects/9");
  assertEquals(JSON.parse(calls[0].body!), { firstName: "Bo" });
  assertEquals(out, { id: 9, firstName: "Bo" });
});

Deno.test("prospect-update: a 204 answers with the id and updated: true", async () => {
  const { ctx } = mockPardotCtx([{ status: 204 }]);
  assertEquals(await action.execute({ prospectId: 9, score: 0 }, ctx), { id: 9, updated: true });
});

Deno.test("prospect-update: score 0 and false are real values, not blanks", async () => {
  const { ctx, calls } = mockPardotCtx([{ status: 204 }]);
  await action.execute({ prospectId: 9, score: 0, isDoNotCall: false }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { score: 0, isDoNotCall: false });
});

Deno.test("prospect-update: refuses an empty update and a bad id before any request", async () => {
  const { ctx, calls } = mockPardotCtx([]);
  await assertRejects(
    async () => await action.execute({ prospectId: 9 }, ctx),
    Error,
    "Nothing to update",
  );
  await assertRejects(
    async () => await action.execute({ prospectId: 0, score: 1 }, ctx),
    Error,
    "positive integer",
  );
  assertEquals(calls.length, 0);
});

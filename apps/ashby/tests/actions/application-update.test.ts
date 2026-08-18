import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/application-update.ts";

const ok = (results: unknown) => ({ status: 200, body: { success: true, results } });

Deno.test("application-update: sets the attribution fields", async () => {
  const { ctx, calls } = mockCtx([ok({ id: "a1" })]);
  await action.execute!({ applicationId: "a1", sourceId: "src_1", creditedToUserId: "u1" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), {
    applicationId: "a1",
    sourceId: "src_1",
    creditedToUserId: "u1",
    sendNotifications: false,
  });
});

Deno.test("application-update: the literal null unsets a field", async () => {
  const { ctx, calls } = mockCtx([ok({ id: "a1" })]);
  await action.execute!({ applicationId: "a1", creditedToUserId: "null" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).creditedToUserId, null);
});

Deno.test("application-update: an empty update is refused rather than sent", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    async () => await action.execute!({ applicationId: "a1" }, ctx),
    Error,
    "nothing to update",
  );
  assertEquals(calls.length, 0);
});

Deno.test("application-update: needs an application id", async () => {
  const { ctx } = mockCtx();
  await assertRejects(
    async () => await action.execute!({ sourceId: "s1" }, ctx),
    Error,
    "applicationId",
  );
});

/** Setting it also moves the first history event, which fixes migrated data. */
Deno.test("application-update: the createdAt param explains the history side effect", () => {
  const p = (action.params as Array<{ key: string; hint?: string }>)
    .find((p) => p.key === "createdAt")!;
  assert(/first history event/.test(p.hint!), p.hint);
});

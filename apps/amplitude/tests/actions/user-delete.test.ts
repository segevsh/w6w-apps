import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, ok } from "./_shared.ts";
import action from "../../actions/user-delete.ts";

const queued = ok({ status: "queued" });

Deno.test("user-delete: posts the ids and the requester", async () => {
  const { ctx, calls } = mockCtx([queued], { display });
  const result = await action.execute!({
    userIds: "user-1071, user-1072",
    requester: "dpo@example.com",
    confirmPermanentDeletion: true,
  }, ctx) as { requested: boolean; userCount: number };
  assertEquals(new URL(calls[0].url).pathname, "/api/2/deletions/users");
  assertEquals(calls[0].method, "POST");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.user_ids, ["user-1071", "user-1072"]);
  assertEquals(body.requester, "dpo@example.com");
  assertEquals(result.requested, true);
  assertEquals(result.userCount, 2);
});

/** There is no undo and no recovery, so it takes a deliberate second input. */
Deno.test("user-delete: refuses without the acknowledgement, and says why", async () => {
  const { ctx, calls } = mockCtx([], { display });
  const error = await assertRejects(
    async () => await action.execute!({ userIds: "user-1071", requester: "dpo@example.com" }, ctx),
    Error,
  );
  assert(/confirmPermanentDeletion/.test(error.message), error.message);
  assert(/no recovery from a backup/.test(error.message), error.message);
  assertEquals(calls.length, 0);
});

/** Amplitude records who asked, which is usually the point of the request. */
Deno.test("user-delete: requires a requester", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(
    async () =>
      await action.execute!({ userIds: "user-1071", confirmPermanentDeletion: true }, ctx),
    Error,
    "records who asked",
  );
  assertEquals(calls.length, 0);
});

Deno.test("user-delete: Amplitude ids work instead of user ids", async () => {
  const { ctx, calls } = mockCtx([queued], { display });
  const result = await action.execute!({
    amplitudeIds: "111,222",
    requester: "dpo@example.com",
    confirmPermanentDeletion: true,
  }, ctx) as { userCount: number };
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.amplitude_ids, ["111", "222"]);
  assertEquals(body.user_ids, undefined);
  assertEquals(result.userCount, 2);
});

Deno.test("user-delete: needs some ids", async () => {
  const { ctx } = mockCtx([], { display });
  await assertRejects(
    async () =>
      await action.execute!({ requester: "dpo@example.com", confirmPermanentDeletion: true }, ctx),
    Error,
    "`userIds` or `amplitudeIds`",
  );
});

Deno.test("user-delete: the unknown-id flag is opt-in", async () => {
  const off = mockCtx([queued], { display });
  await action.execute!({
    userIds: "user-1071",
    requester: "d@e.com",
    confirmPermanentDeletion: true,
  }, off.ctx);
  assertEquals(JSON.parse(off.calls[0].body!).ignore_invalid_id, undefined);

  const on = mockCtx([queued], { display });
  await action.execute!({
    userIds: "user-1071",
    requester: "d@e.com",
    confirmPermanentDeletion: true,
    ignoreInvalidId: true,
  }, on.ctx);
  assertEquals(JSON.parse(on.calls[0].body!).ignore_invalid_id, "true");
});

/** The ids identify people, and this is a regulatory action. */
Deno.test("user-delete: warns loudly and logs only a count", async () => {
  const { ctx, logs } = mockCtx([queued], { display });
  await action.execute!({
    userIds: "ada@example.com",
    requester: "dpo@example.com",
    confirmPermanentDeletion: true,
  }, ctx);
  assertEquals(logs[0].level, "warn");
  assert(!JSON.stringify(logs).includes("ada@"), JSON.stringify(logs));
  assertEquals(logs[0].data, { userCount: 1 });
});

/** Queued is not done — Amplitude takes up to 30 days. */
Deno.test("user-delete: says the deletion is asynchronous", () => {
  assert(/up to\s+30 days/.test(action.description!), action.description);
});

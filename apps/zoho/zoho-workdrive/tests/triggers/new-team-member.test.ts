import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockWorkDriveCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-team-member.ts";

const input = { params: { teamId: "t1" }, subscriptionId: "sub" };
const members = (...ids: string[]) => ({
  body: {
    data: ids.map((id) => ({ id, type: "users", attributes: { email_id: `${id}@x.test` } })),
  },
});

test("new-team-member seeds, emits additions, retries, and calls the literal list endpoint", async () => {
  const seedCtx = mockWorkDriveCtx([members("a")]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seedCtx.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seedCtx.calls[0].method, "GET");
  assertEquals(new URL(seedCtx.calls[0].url).pathname, "/workdrive/api/v1/teams/t1/users");
  assertEquals(new URL(seedCtx.calls[0].url).search, "");
  const first = await trigger.poll!(
    { ...input, state: seeded.nextState },
    mockWorkDriveCtx([members("b", "a")]).ctx,
  );
  const retry = await trigger.poll!(
    { ...input, state: seeded.nextState },
    mockWorkDriveCtx([members("b", "a")]).ctx,
  );
  assertEquals(first.events, [
    { id: "b", type: "users", attributes: { email_id: "b@x.test" } },
  ]);
  assertEquals(retry, first);
});

test("new-team-member does not emit a removed member or an unchanged roster", async () => {
  const seeded = await trigger.poll!(
    { ...input, state: {} },
    mockWorkDriveCtx([members("a", "b")]).ctx,
  );
  const next = await trigger.poll!(
    { ...input, state: seeded.nextState },
    mockWorkDriveCtx([members("a")]).ctx,
  );
  assertEquals(next.events, []);
});

test("new-team-member does not emit an existing member whose attributes changed", async () => {
  const seeded = await trigger.poll!(
    { ...input, state: {} },
    mockWorkDriveCtx([members("a", "b")]).ctx,
  );
  const edited = {
    body: {
      data: [
        { id: "a", type: "users", attributes: { email_id: "a@x.test" } },
        { id: "b", type: "users", attributes: { email_id: "renamed@x.test" } },
      ],
    },
  };
  const next = await trigger.poll!(
    { ...input, state: seeded.nextState },
    mockWorkDriveCtx([edited]).ctx,
  );
  assertEquals(next.events, []);
});

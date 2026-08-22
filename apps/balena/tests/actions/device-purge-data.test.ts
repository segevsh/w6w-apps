import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/device-purge-data.ts";

const UUID = "a".repeat(32);
const online = {
  status: 200,
  body: {
    d: [{ is_online: true, device_name: "winter-sunset", belongs_to__application: { __id: 42 } }],
  },
};
const accepted = { status: 200, body: '{"Data":"OK","Error":""}' };

Deno.test("device-purge-data: sends the fleet id the supervisor requires", async () => {
  const { ctx, calls } = mockCtx([online, accepted]);
  const result = await action.execute({ uuid: UUID, confirm: true }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(new URL(calls[1].url).pathname, "/supervisor/v1/purge");
  assertEquals(JSON.parse(calls[1].body!), { uuid: UUID, data: { appId: 42 } });
  assertEquals(result.purged, true);
  assertEquals(result.fleetId, 42);
});

/** There is no undo and balena keeps no copy. */
Deno.test("device-purge-data: refuses without confirmation, before any lookup", async () => {
  const { ctx, calls } = mockCtx([]);
  const err = await assertRejects(
    async () => await action.execute({ uuid: UUID }, ctx),
    Error,
  );
  assert(/balena keeps no copy/.test(err.message), err.message);
  assertEquals(calls.length, 0);
});

Deno.test("device-purge-data: warns about what it cleared", async () => {
  const { ctx, logs } = mockCtx([online, accepted]);
  await action.execute({ uuid: UUID, confirm: true }, ctx);
  assert(
    logs.some((l) => l.level === "warn" && /every named volume are/.test(l.message)),
    JSON.stringify(logs),
  );
});

Deno.test("device-purge-data: a lock stops the purge and is reported", async () => {
  const { ctx, logs } = mockCtx([
    online,
    { status: 200, body: '{"Data":"","Error":"Update lock is set"}' },
  ]);
  const result = await action.execute({ uuid: UUID, confirm: true }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(result.blockedByLock, true);
  assertEquals(result.purged, false);
  assertEquals(
    logs.filter((l) => l.level === "warn").length,
    0,
    "nothing was cleared to warn about",
  );
});

Deno.test("device-purge-data: is the one non-idempotent action here", () => {
  assertEquals(action.idempotent, false);
  assert(/DESTRUCTIVE/.test(action.description!), action.description);
});

Deno.test("device-purge-data: an offline device is refused", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: { d: [{ is_online: false, belongs_to__application: { __id: 42 } }] },
  }]);
  await assertRejects(
    async () => await action.execute({ uuid: UUID, confirm: true }, ctx),
    Error,
    "not online",
  );
});

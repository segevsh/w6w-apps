import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/device-reboot.ts";

const UUID = "a".repeat(32);
const online = { status: 200, body: { d: [{ is_online: true, device_name: "winter-sunset" }] } };
const offline = { status: 200, body: { d: [{ is_online: false, device_name: "quiet-dust" }] } };
const accepted = { status: 200, body: '{"Data":"OK","Error":""}' };

Deno.test("device-reboot: posts to the supervisor proxy with the uuid", async () => {
  const { ctx, calls } = mockCtx([online, accepted]);
  const result = await action.execute({ uuid: UUID }, ctx) as Record<string, unknown>;
  assertEquals(new URL(calls[1].url).pathname, "/supervisor/v1/reboot");
  assertEquals(JSON.parse(calls[1].body!), { uuid: UUID });
  assertEquals(result.accepted, true);
  assertEquals(result.forced, false);
});

/** Forcing overrides a service that declared itself mid-transaction. */
Deno.test("device-reboot: force sends the flag and warns about what it interrupts", async () => {
  const { ctx, calls, logs } = mockCtx([online, accepted]);
  await action.execute({ uuid: UUID, force: true }, ctx);
  assertEquals(JSON.parse(calls[1].body!), { uuid: UUID, data: { force: true } });
  assert(
    logs.some((l) => l.level === "warn" && /mid-transaction was interrupted/.test(l.message)),
    JSON.stringify(logs),
  );
});

/** A lock refusing a reboot is the lock working. */
Deno.test("device-reboot: a lock is reported as healthy, not as a failure", async () => {
  const { ctx, logs } = mockCtx([online, { status: 423, body: { message: "Update lock is set" } }]);
  const result = await action.execute({ uuid: UUID }, ctx) as Record<string, unknown>;
  assertEquals(result.blockedByLock, true);
  assertEquals(result.accepted, false);
  assert(
    logs.some((l) => l.level === "info" && /doing its job rather than a failure/.test(l.message)),
    JSON.stringify(logs),
  );
});

/** A lock reported in the body rather than the status. */
Deno.test("device-reboot: a lock inside a 200 body is recognised too", async () => {
  const { ctx } = mockCtx([online, {
    status: 200,
    body: '{"Data":"","Error":"Update lock is set"}',
  }]);
  const result = await action.execute({ uuid: UUID }, ctx) as Record<string, unknown>;
  assertEquals(result.blockedByLock, true);
});

/** Any other error is a real error. */
Deno.test("device-reboot: a non-lock failure still throws", async () => {
  const { ctx } = mockCtx([online, { status: 500, body: { message: "boom" } }]);
  await assertRejects(async () => await action.execute({ uuid: UUID }, ctx), Error, "500");
});

/** There is no queued reboot. */
Deno.test("device-reboot: an offline device is refused before the proxy call", async () => {
  const { ctx, calls } = mockCtx([offline]);
  const err = await assertRejects(async () => await action.execute({ uuid: UUID }, ctx), Error);
  assert(/no queued reboot/.test(err.message), err.message);
  assertEquals(calls.length, 1);
});

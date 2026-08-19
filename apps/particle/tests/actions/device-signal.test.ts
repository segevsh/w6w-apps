import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/device-signal.ts";

const ID = "0123456789abcdef01234567";

Deno.test("device-signal: sends signal=1 to start and 0 to stop", async () => {
  const on = mockCtx([{ status: 200, body: { signaling: true, connected: true } }]);
  const started = await action.execute({ deviceId: ID }, on.ctx) as Record<string, unknown>;
  assertEquals(on.calls[0].method, "PUT");
  assertEquals(on.calls[0].body, "signal=1");
  assertEquals(started.signaling, true);

  const off = mockCtx([{ status: 200, body: { signaling: false, connected: true } }]);
  await action.execute({ deviceId: ID, on: false }, off.ctx);
  assertEquals(off.calls[0].body, "signal=0");
});

/** Everything else here that reaches a device does something. */
Deno.test("device-signal: says it runs no firmware and changes no state", () => {
  assert(/Runs no firmware and changes no state/.test(action.description!), action.description);
  assert(
    /correlate a device id with a box on a wall/.test(action.description!),
    action.description,
  );
  assertEquals(action.idempotent, true);
});

Deno.test("device-signal: an unreachable device surfaces the error", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { error: "Timed out." } }]);
  let message = "";
  try {
    await action.execute({ deviceId: ID }, ctx);
  } catch (err) {
    message = String(err);
  }
  assert(/did not answer in time/.test(message), message);
});

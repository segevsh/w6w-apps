import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/service-state.ts";

const ORG = "11111111-2222-3333-4444-555555555555";
const SVC = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
const D = { display: { organizationId: ORG, plane: "control" } };

const state = (s: string) => ({ status: 200, body: { result: { state: s } } });

Deno.test("service-state: reads the state, then PATCHes it", async () => {
  const { ctx, calls } = mockCtx([state("stopped"), state("starting")], D);
  const result = await action.execute(
    { serviceId: SVC, command: "start" },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(calls[1].method, "PATCH");
  assert(calls[1].url.endsWith(`/services/${SVC}/state`), calls[1].url);
  assertEquals(JSON.parse(calls[1].body!), { command: "start" });
  assertEquals(result.changed, true);
  assertEquals(result.previousState, "stopped");
});

/** A stopped service does not wake on a query the way an idle one does. */
Deno.test("service-state: stopping needs an acknowledgement, and points at idle scaling", async () => {
  const { ctx, calls } = mockCtx([], D);
  let message = "";
  try {
    await action.execute({ serviceId: SVC, command: "stop" }, ctx);
  } catch (err) {
    message = String(err);
  }
  assert(/set `confirmStop`/.test(message), message);
  assert(/does not wake on a query/.test(message), message);
  assert(/`service-scale` turns on idle scaling instead/.test(message), message);
  assertEquals(calls.length, 0);
});

Deno.test("service-state: an acknowledged stop goes through and warns", async () => {
  const { ctx, logs } = mockCtx([state("running"), state("stopping")], D);
  const result = await action.execute(
    { serviceId: SVC, command: "stop", confirmStop: true },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(result.state, "stopping");
  assertEquals(logs[0].level, "warn");
  assert(/queries will fail until it is started again/.test(logs[0].message), logs[0].message);
});

/** A scheduled stop hitting an already-stopped service is not a failure. */
Deno.test("service-state: an already-settled service is a no-op, not a 409", async () => {
  const stopped = mockCtx([state("stopped")], D);
  const already = await action.execute(
    { serviceId: SVC, command: "stop", confirmStop: true },
    stopped.ctx,
  ) as Record<string, unknown>;
  assertEquals(stopped.calls.length, 1, "no PATCH was sent");
  assertEquals(already.changed, false);
  assert(/already stopped/.test(stopped.logs[0].message), stopped.logs[0].message);

  const running = mockCtx([state("running")], D);
  const noop = await action.execute(
    { serviceId: SVC, command: "start" },
    running.ctx,
  ) as Record<string, unknown>;
  assertEquals(running.calls.length, 1);
  assertEquals(noop.changed, false);
});

/** A change during a transition is a 409 rather than a queue. */
Deno.test("service-state: a service in flight surfaces the conflict", async () => {
  const { ctx } = mockCtx([state("starting"), {
    status: 409,
    body: { error: "service is starting" },
  }], D);
  let message = "";
  try {
    await action.execute({ serviceId: SVC, command: "start" }, ctx);
  } catch (err) {
    message = String(err);
  }
  assert(/refuses the change rather than queueing/.test(message), message);
});

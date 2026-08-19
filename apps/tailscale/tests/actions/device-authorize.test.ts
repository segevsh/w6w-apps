import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/device-authorize.ts";

const waiting = { status: 200, body: { authorized: false, hostname: "new-box" } };
const already = { status: 200, body: { authorized: true, hostname: "web-01" } };
const ok = { status: 200, body: {} };

/** Tailscale answers a bare 200 either way, so the read is what makes this legible. */
Deno.test("device-authorize: approves a waiting device and reports the change", async () => {
  const { ctx, calls } = mockCtx([waiting, ok]);
  const result = await action.execute({ deviceId: "n3" }, ctx) as Record<string, unknown>;

  assertEquals(new URL(calls[1].url).pathname, "/api/v2/device/n3/authorized");
  assertEquals(calls[1].method, "POST");
  assertEquals(JSON.parse(calls[1].body!), { authorized: true });
  assertEquals(result.changed, true);
  assertEquals(result.hostname, "new-box");
});

Deno.test("device-authorize: authorizing an already-authorized device changes nothing", async () => {
  const { ctx } = mockCtx([already, ok]);
  const result = await action.execute({ deviceId: "n1" }, ctx) as Record<string, unknown>;
  assertEquals(result.changed, false);
  assertEquals(result.authorized, true);
});

/** The reversible half of device-delete. */
Deno.test("device-authorize: de-authorizing warns that the registration survives", async () => {
  const { ctx, calls, logs } = mockCtx([already, ok]);
  const result = await action.execute({ deviceId: "n1", authorized: false }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(JSON.parse(calls[1].body!), { authorized: false });
  assertEquals(result.changed, true);
  assert(
    logs.some((l) => l.level === "warn" && /stays registered/.test(l.message)),
    JSON.stringify(logs),
  );
});

Deno.test("device-authorize: requires an id", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => await action.execute({}, ctx), Error, "`deviceId` is required");
  assertEquals(calls.length, 0);
});

/** With approval off, this succeeds and does nothing. */
Deno.test("device-authorize: says it only means something when approval is enabled", () => {
  assert(/DEVICE APPROVAL/.test(action.description!), action.description);
  assertEquals(action.idempotent, true);
});

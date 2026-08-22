import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/device-expire-key.ts";

const device = { status: 200, body: { hostname: "laptop", tags: [], keyExpiryDisabled: false } };
const tagged = {
  status: 200,
  body: { hostname: "web-01", tags: ["tag:prod"], keyExpiryDisabled: true },
};
const ok = { status: 200, body: {} };

Deno.test("device-expire-key: expires the key after the confirmation", async () => {
  const { ctx, calls } = mockCtx([device, ok]);
  const result = await action.execute({ deviceId: "n2", confirm: true }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(new URL(calls[1].url).pathname, "/api/v2/device/n2/expire");
  assertEquals(calls[1].method, "POST");
  assertEquals(result.expired, true);
  assertEquals(result.hostname, "laptop");
});

/** There is no un-expire, and an unattended machine may have nobody to log in. */
Deno.test("device-expire-key: refuses without confirmation and names the alternative", async () => {
  const { ctx, calls } = mockCtx([]);
  const err = await assertRejects(
    async () => await action.execute({ deviceId: "n2" }, ctx),
    Error,
  );
  assert(/no un-expire/.test(err.message), err.message);
  assert(/device-authorize/.test(err.message), err.message);
  assertEquals(calls.length, 0);
});

/** A tagged device needs an auth key to come back. */
Deno.test("device-expire-key: says so when the device was tagged", async () => {
  const { ctx, logs } = mockCtx([tagged, ok]);
  const result = await action.execute({ deviceId: "n1", confirm: true }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(result.wasTagged, true);
  assertEquals(result.hadExpiryDisabled, true);
  assert(logs.some((l) => /needs an auth key/.test(l.message)), JSON.stringify(logs));
});

Deno.test("device-expire-key: always warns that the machine is logged out", async () => {
  const { ctx, logs } = mockCtx([device, ok]);
  await action.execute({ deviceId: "n2", confirm: true }, ctx);
  assert(
    logs.some((l) => l.level === "warn" && /logged out/.test(l.message)),
    JSON.stringify(logs),
  );
});

Deno.test("device-expire-key: requires an id", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(async () => await action.execute({ confirm: true }, ctx), Error, "deviceId");
});

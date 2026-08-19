import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/event-publish.ts";

const ok = { status: 200, body: { ok: true } };

Deno.test("event-publish: posts the event as form fields", async () => {
  const { ctx, calls } = mockCtx([ok]);
  const result = await action.execute(
    { name: "fleet/reboot", data: "now" },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(calls[0].url, "https://api.particle.io/v1/devices/events");
  assertEquals(calls[0].method, "POST");
  const form = new URLSearchParams(calls[0].body!);
  assertEquals(form.get("name"), "fleet/reboot");
  assertEquals(form.get("data"), "now");
  assertEquals(form.get("private"), "true");
  assertEquals(result.published, true);
});

/** Private by default here, against the API's own default. */
Deno.test("event-publish: publishing publicly needs an acknowledgement", async () => {
  const { ctx, calls } = mockCtx([]);
  let message = "";
  try {
    await action.execute({ name: "telemetry", data: "x", private: false }, ctx);
  } catch (err) {
    message = String(err);
  }
  assert(/set `confirmPublic`/.test(message), message);
  assert(/every Particle account in the world/.test(message), message);
  assert(/no way to recall it/.test(message), message);
  assertEquals(calls.length, 0);
});

Deno.test("event-publish: an acknowledged public event goes through and warns", async () => {
  const { ctx, calls, logs } = mockCtx([ok]);
  const result = await action.execute(
    { name: "telemetry", data: "x", private: false, confirmPublic: true },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(new URLSearchParams(calls[0].body!).get("private"), "false");
  assertEquals(result.private, false);
  assertEquals(logs[0].level, "warn");
  assert(/visible to every Particle account/.test(logs[0].message), logs[0].message);
});

/** Both limits are in bytes, and a device cannot tell it was truncated. */
Deno.test("event-publish: the name and payload limits are enforced in bytes", async () => {
  const longName = mockCtx([]);
  let nameMessage = "";
  try {
    await action.execute({ name: "x".repeat(65) }, longName.ctx);
  } catch (err) {
    nameMessage = String(err);
  }
  assert(/name is 65 bytes and Particle's limit is 64/.test(nameMessage), nameMessage);

  const longData = mockCtx([]);
  let dataMessage = "";
  try {
    await action.execute({ name: "e", data: "x".repeat(1025) }, longData.ctx);
  } catch (err) {
    dataMessage = String(err);
  }
  assert(/payload is 1025 bytes and Particle's limit is 1024/.test(dataMessage), dataMessage);
  assert(/could not tell that it had been/.test(dataMessage), dataMessage);
  assertEquals(longData.calls.length, 0);
});

Deno.test("event-publish: a multi-byte name is measured in bytes", async () => {
  const { ctx } = mockCtx([]);
  let message = "";
  try {
    // 33 two-byte characters is 66 bytes.
    await action.execute({ name: "é".repeat(33) }, ctx);
  } catch (err) {
    message = String(err);
  }
  assert(/66 bytes/.test(message), message);
});

/** Nothing reports which devices received it. */
Deno.test("event-publish: reports delivery as unknown rather than claiming success", async () => {
  const { ctx } = mockCtx([ok]);
  const result = await action.execute({ name: "e", data: "d" }, ctx) as Record<string, unknown>;
  assertEquals(result.delivered, undefined);
  assertEquals(result.dataBytes, 1);
});

/** The payload is whatever the workflow is telling a fleet. */
Deno.test("event-publish: logs the name and size, never the payload", async () => {
  const { ctx, logs } = mockCtx([ok]);
  await action.execute({ name: "cmd", data: "secret-command" }, ctx);
  assertEquals(JSON.stringify(logs).includes("secret-command"), false);
  assertEquals(logs[0].data, { name: "cmd", dataBytes: 14 });
});

Deno.test("event-publish: a name is required and it is not idempotent", async () => {
  const { ctx, calls } = mockCtx([]);
  let message = "";
  try {
    await action.execute({}, ctx);
  } catch (err) {
    message = String(err);
  }
  assert(/`name` is required/.test(message), message);
  assertEquals(calls.length, 0);
  assertEquals(action.idempotent, false);
});

import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/device-identify.ts";

const UUID = "a".repeat(32);
const online = { status: 200, body: { d: [{ is_online: true, device_name: "winter-sunset" }] } };

/** Blink answers with an empty body. */
Deno.test("device-identify: posts to blink and treats an empty body as accepted", async () => {
  const { ctx, calls } = mockCtx([online, { status: 200, body: "" }]);
  const result = await action.execute({ uuid: UUID }, ctx) as Record<string, unknown>;
  assertEquals(new URL(calls[1].url).pathname, "/supervisor/v1/blink");
  assertEquals(JSON.parse(calls[1].body!), { uuid: UUID });
  assertEquals(result.accepted, true);
  assertEquals(result.durationSeconds, 15);
  assertEquals(result.name, "winter-sunset");
});

/** The supervisor cannot say whether a light came on. */
Deno.test("device-identify: always admits the hardware may not blink", async () => {
  const { ctx } = mockCtx([online, { status: 200, body: "" }]);
  const result = await action.execute({ uuid: UUID }, ctx) as Record<string, unknown>;
  assertEquals(result.hardwareMayNotBlink, true);
  assert(/whether or not the hardware HAS an LED/.test(action.description!), action.description);
});

Deno.test("device-identify: an offline device is refused", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { d: [{ is_online: false }] } }]);
  await assertRejects(async () => await action.execute({ uuid: UUID }, ctx), Error, "not online");
  assertEquals(calls.length, 1);
});

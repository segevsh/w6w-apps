import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/device-restart-services.ts";

const UUID = "a".repeat(32);
const online = {
  status: 200,
  body: { d: [{ is_online: true, belongs_to__application: { __id: 42 } }] },
};
const ok = { status: 200, body: "OK" };

/** The supervisor wants an appId; the caller has a uuid. */
Deno.test("device-restart-services: looks up the fleet id and sends it", async () => {
  const { ctx, calls } = mockCtx([online, ok]);
  const result = await action.execute({ uuid: UUID }, ctx) as Record<string, unknown>;
  assertEquals(new URL(calls[1].url).pathname, "/supervisor/v1/restart");
  assertEquals(JSON.parse(calls[1].body!), { uuid: UUID, data: { appId: 42 } });
  assertEquals(result.fleetId, 42);
  assertEquals(result.accepted, true);
});

/** A bare `OK` is a success, and it is not JSON. */
Deno.test("device-restart-services: accepts the bare OK the route answers with", async () => {
  const { ctx } = mockCtx([online, { status: 200, body: "OK" }]);
  const result = await action.execute({ uuid: UUID }, ctx) as Record<string, unknown>;
  assertEquals(result.accepted, true);
});

Deno.test("device-restart-services: says the containers are recreated", async () => {
  const { ctx, logs } = mockCtx([online, ok]);
  await action.execute({ uuid: UUID }, ctx);
  assert(
    logs.some((l) => /removed and recreated/.test(l.message)),
    JSON.stringify(logs),
  );
  assert(/REMOVES AND RECREATES/.test(action.description!), action.description);
});

Deno.test("device-restart-services: an offline device is refused", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { d: [{ is_online: false, belongs_to__application: { __id: 42 } }] },
  }]);
  await assertRejects(async () => await action.execute({ uuid: UUID }, ctx), Error, "not online");
  assertEquals(calls.length, 1);
});

Deno.test("device-restart-services: a device with no fleet has no appId to send", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { d: [{ is_online: true }] } }]);
  await assertRejects(async () => await action.execute({ uuid: UUID }, ctx), Error, "appId");
});

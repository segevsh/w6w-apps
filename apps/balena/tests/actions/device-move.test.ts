import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/device-move.ts";

const UUID = "a".repeat(32);
const device = {
  status: 200,
  body: {
    d: [{ id: 5, belongs_to__application: { __id: 1 }, is_running__release: { __id: 900 } }],
  },
};
const destination = { status: 200, body: { d: [{ id: 2, slug: "acme/gateways" }] } };
const oldFleetVariables = {
  status: 200,
  body: { d: [{ name: "MQTT_HOST" }, { name: "LOG_LEVEL" }] },
};
const ok = { status: 200, body: {} };

Deno.test("device-move: patches belongs_to__application to the destination id", async () => {
  const { ctx, calls } = mockCtx([device, destination, oldFleetVariables, ok]);
  const result = await action.execute({ uuid: UUID, fleet: "acme/gateways" }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(calls[3].method, "PATCH");
  assertEquals(JSON.parse(calls[3].body!), { belongs_to__application: 2 });
  assertEquals(result.changed, true);
  assertEquals(result.willChangeRelease, true);
});

/** The commonest way a moved device comes up misconfigured. */
Deno.test("device-move: names the fleet variables that do not travel, and warns", async () => {
  const { ctx, logs } = mockCtx([device, destination, oldFleetVariables, ok]);
  const result = await action.execute({ uuid: UUID, fleet: "acme/gateways" }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(result.lostFleetVariables, ["MQTT_HOST", "LOG_LEVEL"]);
  assert(
    logs.some((l) => l.level === "warn" && /do not travel with the device/.test(l.message)),
    JSON.stringify(logs),
  );
});

/** Moving a device to where it already is should not be a deployment. */
Deno.test("device-move: a no-op move changes nothing and patches nothing", async () => {
  const { ctx, calls } = mockCtx([device, {
    status: 200,
    body: { d: [{ id: 1, slug: "acme/sensors" }] },
  }]);
  const result = await action.execute({ uuid: UUID, fleet: "acme/sensors" }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(result.changed, false);
  assertEquals(result.willChangeRelease, false);
  assertEquals(calls.length, 2, "it must not patch");
});

Deno.test("device-move: an unknown destination is refused", async () => {
  const { ctx } = mockCtx([device, { status: 200, body: { d: [] } }]);
  await assertRejects(
    async () => await action.execute({ uuid: UUID, fleet: "acme/nope" }, ctx),
    Error,
    "no fleet matched",
  );
});

Deno.test("device-move: requires a destination", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => await action.execute({ uuid: UUID }, ctx), Error, "`fleet`");
  assertEquals(calls.length, 0);
});

Deno.test("device-move: says a move is a deployment", () => {
  assert(/DEPLOYMENT/.test(action.description!), action.description);
});

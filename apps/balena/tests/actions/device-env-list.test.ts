import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/device-env-list.ts";

const UUID = "a".repeat(32);
const device = { status: 200, body: { d: [{ id: 5, belongs_to__application: { __id: 1 } }] } };
const deviceVars = {
  status: 200,
  body: { d: [{ id: 10, name: "LOG_LEVEL", value: "debug" }] },
};
const fleetVars = {
  status: 200,
  body: {
    d: [
      { id: 20, name: "LOG_LEVEL", value: "info" },
      { id: 21, name: "MQTT_HOST", value: "mqtt.example.com" },
    ],
  },
};
const serviceVars = {
  status: 200,
  body: { d: [{ id: 30, name: "PORT", value: "8080", service_install: { __id: 77 } }] },
};

/** No single balena endpoint shows the layering. */
Deno.test("device-env-list: layers fleet, device and service variables", async () => {
  const { ctx, calls } = mockCtx([device, deviceVars, fleetVars, serviceVars]);
  const result = await action.execute({ uuid: UUID }, ctx) as Record<string, unknown>;

  assertEquals(calls.map((call) => new URL(call.url).pathname), [
    "/v7/device",
    "/v7/device_environment_variable",
    "/v7/application_environment_variable",
    "/v7/device_service_environment_variable",
  ]);
  assertEquals(result.effective, {
    LOG_LEVEL: "debug",
    MQTT_HOST: "mqtt.example.com",
    PORT: "8080",
  });
  assertEquals(result.sources, { LOG_LEVEL: "device", MQTT_HOST: "fleet", PORT: "service" });
});

/** A variable set once for debugging keeps overriding the fleet forever. */
Deno.test("device-env-list: names the fleet values this device shadows", async () => {
  const { ctx } = mockCtx([device, deviceVars, fleetVars, serviceVars]);
  const result = await action.execute({ uuid: UUID }, ctx) as Record<string, unknown>;
  assertEquals(result.overriddenFleetVariables, ["LOG_LEVEL"]);
});

Deno.test("device-env-list: filters by name substring after layering", async () => {
  const { ctx } = mockCtx([device, deviceVars, fleetVars, serviceVars]);
  const result = await action.execute({ uuid: UUID, nameContains: "mqtt" }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(Object.keys(result.effective as object), ["MQTT_HOST"]);
  assertEquals(result.count, 1);
});

/** Values are configuration and some of them are secrets. */
Deno.test("device-env-list: logs how many names, never the values", async () => {
  const { ctx, logs } = mockCtx([device, deviceVars, fleetVars, serviceVars]);
  await action.execute({ uuid: UUID }, ctx);
  const data = JSON.stringify(logs);
  assert(/names/.test(data), data);
  assert(!/mqtt\.example\.com|debug/.test(data), data);
});

Deno.test("device-env-list: an unknown device is refused", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { d: [] } }]);
  await assertRejects(async () => await action.execute({ uuid: UUID }, ctx), Error, "no device");
});

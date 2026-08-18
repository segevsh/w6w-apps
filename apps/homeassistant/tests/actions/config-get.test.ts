import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, ok } from "./_shared.ts";
import action from "../../actions/config-get.ts";

const config = ok({
  version: "2026.8.1",
  location_name: "Home",
  time_zone: "Europe/London",
  unit_system: { temperature: "°C", length: "km" },
  state: "RUNNING",
  components: ["light", "sensor", "mobile_app"],
});

Deno.test("config-get: reports version, zone and the instance-wide units", async () => {
  const { ctx, calls } = mockCtx([config], { display });
  const result = await action.execute!({}, ctx) as {
    version: string;
    timeZone: string;
    unitSystem: { temperature: string };
    ready: boolean;
  };
  assertEquals(calls[0].url, "https://abc.ui.nabu.casa/api/config");
  assertEquals(result.version, "2026.8.1");
  assertEquals(result.timeZone, "Europe/London");
  assertEquals(result.unitSystem.temperature, "°C");
  assertEquals(result.ready, true);
});

/** STARTING is a real window during which entities exist and read unavailable. */
Deno.test("config-get: STARTING is not ready", async () => {
  const { ctx } = mockCtx([ok({ state: "STARTING" })], { display });
  const result = await action.execute!({}, ctx) as { ready: boolean; state: string };
  assertEquals(result.ready, false);
  assertEquals(result.state, "STARTING");
});

/** The list is long, and is how to check an integration is loaded. */
Deno.test("config-get: the component list is opt-in but always counted", async () => {
  const without = mockCtx([config], { display });
  const hidden = await action.execute!({}, without.ctx) as {
    components?: string[];
    componentCount: number;
  };
  assertEquals(hidden.components, undefined);
  assertEquals(hidden.componentCount, 3);

  const with_ = mockCtx([config], { display });
  const shown = await action.execute!({ includeComponents: true }, with_.ctx) as {
    components: string[];
  };
  assertEquals(shown.components.length, 3);
});

Deno.test("config-get: says the unit system is instance-wide", () => {
  assert(/instance-wide/.test(action.description!), action.description);
});

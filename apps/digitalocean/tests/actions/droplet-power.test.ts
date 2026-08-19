import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/droplet-power.ts";

const accepted = (type: string) => ({
  status: 201,
  body: { action: { id: 7654321, status: "in-progress", type } },
});

Deno.test("droplet-power: posts the action type", async () => {
  const { ctx, calls } = mockCtx([accepted("shutdown")]);
  const result = await action.execute(
    { dropletId: "3164444", action: "shutdown" },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(new URL(calls[0].url).pathname, "/v2/droplets/3164444/actions");
  assertEquals(JSON.parse(calls[0].body!), { type: "shutdown" });
  assertEquals(result.status, "in-progress");
});

/** DigitalOcean's own docs warn about this; the names do not convey it. */
Deno.test("droplet-power: the hard forms need an acknowledgement", async () => {
  for (const type of ["power_off", "power_cycle"]) {
    const { ctx, calls } = mockCtx([]);
    let message = "";
    try {
      await action.execute({ dropletId: "3164444", action: type }, ctx);
    } catch (err) {
      message = String(err);
    }
    assert(/set `confirmHardPower`/.test(message), `${type}: ${message}`);
    assert(/as if the plug were pulled/.test(message), message);
    assert(/`shutdown` is the graceful one/.test(message), message);
    assertEquals(calls.length, 0);
  }
});

Deno.test("droplet-power: the graceful forms are not gated", async () => {
  for (const type of ["shutdown", "reboot", "power_on"]) {
    const { ctx, calls } = mockCtx([accepted(type)]);
    await action.execute({ dropletId: "3164444", action: type }, ctx);
    assertEquals(calls.length, 1, type);
  }
});

Deno.test("droplet-power: an acknowledged hard power-off warns", async () => {
  const { ctx, logs } = mockCtx([accepted("power_off")]);
  await action.execute(
    { dropletId: "3164444", action: "power_off", confirmHardPower: true },
    ctx,
  );
  assertEquals(logs[0].level, "warn");
  assert(/an unclean stop/.test(logs[0].message), logs[0].message);
});

/** There is no cost reason to power a droplet down. */
Deno.test("droplet-power: always reports that the droplet still bills", async () => {
  const { ctx } = mockCtx([accepted("shutdown")]);
  const result = await action.execute(
    { dropletId: "3164444", action: "shutdown" },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(result.stillBilling, true);
  assert(/none of this stops the bill/.test(action.description!), action.description);
});

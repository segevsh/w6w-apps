import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/device-unclaim.ts";

const ID = "0123456789abcdef01234567";
const device = (cellular = false) => ({
  status: 200,
  body: { id: ID, name: "gateway", cellular },
});

Deno.test("device-unclaim: reads the device, then deletes the claim", async () => {
  const { ctx, calls } = mockCtx([device(), { status: 200, body: { ok: true } }]);
  const result = await action.execute(
    { deviceId: ID, confirmName: "gateway" },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(calls[1].method, "DELETE");
  assertEquals(result.unclaimed, true);
  assertEquals(result.name, "gateway");
});

Deno.test("device-unclaim: the confirmation is the name, not the id", async () => {
  for (const confirm of [undefined, "", ID, "GATEWAY"]) {
    const { ctx, calls } = mockCtx([device()]);
    let message = "";
    try {
      await action.execute({ deviceId: ID, confirmName: confirm }, ctx);
    } catch (err) {
      message = String(err);
    }
    assert(/`confirmName` must match the device name/.test(message), `${confirm}: ${message}`);
    assertEquals(calls.length, 1);
  }
});

/** The opposite of what "delete" suggests. */
Deno.test("device-unclaim: warns that the device is untouched and still connecting", async () => {
  const { ctx, logs } = mockCtx([device(), { status: 200, body: {} }]);
  const result = await action.execute(
    { deviceId: ID, confirmName: "gateway" },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(result.stillConnecting, true);
  assertEquals(logs[0].level, "warn");
  assert(/carries on connecting exactly as before/.test(logs[0].message), logs[0].message);
  assert(/Not a way to decommission hardware/.test(action.description!), action.description);
});

/** On cellular, a device in a drawer keeps using data. */
Deno.test("device-unclaim: a cellular device gets the data warning too", async () => {
  const { ctx, logs } = mockCtx([device(true), { status: 200, body: {} }]);
  await action.execute({ deviceId: ID, confirmName: "gateway" }, ctx);
  assert(/including using cellular data/.test(logs[0].message), logs[0].message);
});

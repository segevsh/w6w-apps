import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/product-device-add.ts";

const A = "0123456789abcdef01234567";
const B = "0123456789abcdef01234568";
const added = { status: 200, body: { updated: 2, existingDeviceIds: [], nonmemberDeviceIds: [] } };

Deno.test("product-device-add: posts the ids as a comma-separated form field", async () => {
  const { ctx, calls } = mockCtx([added]);
  const result = await action.execute({
    product: "sensors",
    deviceIds: `${A}, ${B}`,
    confirmFirmwareRelease: true,
  }, ctx) as Record<string, unknown>;
  assertEquals(new URL(calls[0].url).pathname, "/v1/products/sensors/devices");
  assertEquals(new URLSearchParams(calls[0].body!).get("ids"), `${A},${B}`);
  assertEquals(result.requested, 2);
  assertEquals(result.updated, 2);
});

/** Adding a device to a product can reflash it. */
Deno.test("product-device-add: needs the firmware acknowledgement, and says why", async () => {
  const { ctx, calls } = mockCtx([]);
  let message = "";
  try {
    await action.execute({ product: "sensors", deviceIds: A }, ctx);
  } catch (err) {
    message = String(err);
  }
  assert(/set `confirmFirmwareRelease`/.test(message), message);
  assert(/updated to that firmware the next time it connects/.test(message), message);
  assert(/leaves the claiming account/.test(message), message);
  assertEquals(calls.length, 0);
});

Deno.test("product-device-add: ids are validated before anything is sent", async () => {
  const { ctx, calls } = mockCtx([]);
  let message = "";
  try {
    await action.execute({
      product: "sensors",
      deviceIds: `${A}, my-sensor`,
      confirmFirmwareRelease: true,
    }, ctx);
  } catch (err) {
    message = String(err);
  }
  assert(/not 24-character hexadecimal device ids: my-sensor/.test(message), message);
  assertEquals(calls.length, 0);
});

Deno.test("product-device-add: already-present devices are reported, not failed", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: { updated: 1, existingDeviceIds: [B], nonmemberDeviceIds: [] },
  }]);
  const result = await action.execute({
    product: "sensors",
    deviceIds: `${A}, ${B}`,
    confirmFirmwareRelease: true,
  }, ctx) as Record<string, unknown>;
  assertEquals(result.existing, [B]);
});

Deno.test("product-device-add: a product and at least one id are required", async () => {
  for (const input of [{ deviceIds: A }, { product: "sensors", deviceIds: "" }]) {
    const { ctx, calls } = mockCtx([]);
    let threw = false;
    try {
      await action.execute({ ...input, confirmFirmwareRelease: true }, ctx);
    } catch {
      threw = true;
    }
    assert(threw, JSON.stringify(input));
    assertEquals(calls.length, 0);
  }
});

Deno.test("product-device-add: warns that the product now owns them", async () => {
  const { ctx, logs } = mockCtx([added]);
  await action.execute({ product: "sensors", deviceIds: A, confirmFirmwareRelease: true }, ctx);
  assertEquals(logs[0].level, "warn");
  assert(/now belong to the product/.test(logs[0].message), logs[0].message);
});

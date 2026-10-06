import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import getRateSettings from "../../actions/get-rate-settings.ts";

Deno.test("get-rate-settings: houseId is optional", async () => {
  const { ctx, calls } = mockCtx([{ body: { currency_code: "EUR" } }, { body: {} }]);
  await getRateSettings.execute({ propertyId: 5 }, ctx);
  await getRateSettings.execute({}, ctx);
  assertEquals(calls[0].url, "https://api.lodgify.com/v2/rates/settings?houseId=5");
  assertEquals(calls[1].url, "https://api.lodgify.com/v2/rates/settings");
});

import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/address-verify.ts";

const verified = (address: Record<string, unknown>, success = true, errors: unknown[] = []) => ({
  status: 200,
  body: { id: "adr_1", ...address, verifications: { delivery: { success, errors } } },
});

Deno.test("address-verify: posts a wrapped address to the verify endpoint", async () => {
  const { ctx, calls } = mockCtx([verified({ street1: "179 N HARBOR DR", zip: "90277-2506" })]);
  await action.execute!({ street1: "179 n harbor dr", city: "Redondo Beach", zip: "90277" }, ctx);
  assertEquals(calls[0].url, "https://api.easypost.com/v2/addresses/create_and_verify");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.address.street1, "179 n harbor dr");
  // Country defaults rather than being omitted.
  assertEquals(body.address.country, "US");
});

/**
 * Verification corrects as well as validates — the ZIP+4 is what carriers rate
 * on, and a correction is worth showing a human before it goes on a parcel.
 */
Deno.test("address-verify: reports the corrected address and that it changed", async () => {
  const { ctx } = mockCtx([verified({
    street1: "179 N HARBOR DR",
    city: "REDONDO BEACH",
    state: "CA",
    zip: "90277-2506",
  })]);
  const result = await action.execute!({
    street1: "179 n harbor dr",
    city: "Redondo Beach",
    state: "CA",
    zip: "90277",
  }, ctx) as { verified: boolean; changed: boolean; verifiedAddress: { zip: string } };
  assertEquals(result.verified, true);
  assertEquals(result.changed, true);
  assertEquals(result.verifiedAddress.zip, "90277-2506");
});

/** Casing alone is not a change worth flagging. */
Deno.test("address-verify: a case-only difference is not reported as changed", async () => {
  const { ctx } = mockCtx([verified({ street1: "179 N HARBOR DR", city: "REDONDO BEACH" })]);
  const result = await action.execute!({
    street1: "179 n harbor dr",
    city: "redondo beach",
  }, ctx) as { changed: boolean };
  assertEquals(result.changed, false);
});

/** An unverifiable address is a result, not a fault. */
Deno.test("address-verify: a failure returns verified false with the reasons", async () => {
  const { ctx } = mockCtx([verified({ street1: "1 Nowhere" }, false, [
    { field: "street1", message: "Street not found", suggestion: "1 Somewhere St" },
  ])]);
  const result = await action.execute!({ street1: "1 Nowhere" }, ctx) as {
    verified: boolean;
    verificationErrors: Array<{ suggestion: string }>;
  };
  assertEquals(result.verified, false);
  assertEquals(result.verificationErrors[0].suggestion, "1 Somewhere St");
});

Deno.test("address-verify: needs a street", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(async () => await action.execute!({ city: "Berlin" }, ctx), Error, "street1");
  assertEquals(calls.length, 0);
});

/** An address is somebody's home. */
Deno.test("address-verify: logs the outcome, never the address", async () => {
  const { ctx, logs } = mockCtx([verified({ street1: "179 N HARBOR DR" })]);
  await action.execute!({ street1: "179 N Harbor Dr", name: "Dr Steve Brule" }, ctx);
  assert(!JSON.stringify(logs).includes("Harbor"), JSON.stringify(logs));
  assert(!JSON.stringify(logs).includes("Brule"), JSON.stringify(logs));
  assertEquals(logs[0].data, { addressId: "adr_1", verified: true, changed: false });
});

Deno.test("address-verify: says why it is worth the call", () => {
  assert(/before a wrong address costs a label/.test(action.description!), action.description);
});

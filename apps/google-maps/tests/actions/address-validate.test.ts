import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { rpc } from "./_shared.ts";
import action, { describeConcerns } from "../../actions/address-validate.ts";

const clean = rpc({
  responseId: "r-1",
  result: {
    verdict: {
      addressComplete: true,
      inputGranularity: "PREMISE",
      validationGranularity: "PREMISE",
    },
    address: { formattedAddress: "1600 Amphitheatre Pkwy, Mountain View, CA 94043-1351, USA" },
  },
});

Deno.test("address-validate: a clean address is deliverable with no concerns", async () => {
  const { ctx, calls } = mockCtx([clean]);
  const result = await action.execute!({
    addressLines: "1600 Amphitheatre Pkwy\nMountain View, CA",
    regionCode: "US",
  }, ctx) as { deliverable: boolean; concerns: string[]; responseId: string };
  assertEquals(calls[0].url, "https://addressvalidation.googleapis.com/v1:validateAddress");
  assertEquals(JSON.parse(calls[0].body!).address.addressLines.length, 2);
  assertEquals(result.deliverable, true);
  assertEquals(result.concerns, []);
  assertEquals(result.responseId, "r-1");
});

/**
 * The distinction from `geocode`: this says what Google had to change, and a
 * replaced component is a different address from the one that was submitted.
 */
Deno.test("address-validate: a replaced component makes it undeliverable, and says so", async () => {
  const { ctx } = mockCtx([
    rpc({
      result: {
        verdict: {
          addressComplete: true,
          validationGranularity: "PREMISE",
          hasReplacedComponents: true,
        },
      },
    }),
  ]);
  const result = await action.execute!({ addressLines: "x" }, ctx) as {
    deliverable: boolean;
    concerns: string[];
  };
  assertEquals(result.deliverable, false);
  assert(result.concerns.some((c) => /replaced/.test(c)), result.concerns.join("; "));
});

/** A street confirmed but not the building is not a deliverable address. */
Deno.test("address-validate: ROUTE granularity is a concern", () => {
  const concerns = describeConcerns({
    addressComplete: true,
    validationGranularity: "ROUTE",
  });
  assert(concerns.some((c) => /ROUTE/.test(c)), concerns.join("; "));
});

/** "Near the building, but not it" is deliberately treated as not good enough. */
Deno.test("address-validate: PREMISE_PROXIMITY is deliberately not good enough", () => {
  assertEquals(
    describeConcerns({
      addressComplete: true,
      validationGranularity: "PREMISE_PROXIMITY",
    }).length,
    1,
  );
  assertEquals(
    describeConcerns({
      addressComplete: true,
      validationGranularity: "SUB_PREMISE",
    }).length,
    0,
  );
});

Deno.test("address-validate: every verdict flag becomes its own concern", () => {
  const concerns = describeConcerns({
    addressComplete: false,
    validationGranularity: "OTHER",
    hasUnconfirmedComponents: true,
    hasReplacedComponents: true,
    hasInferredComponents: true,
    hasSpellCorrectedComponents: true,
  });
  assertEquals(concerns.length, 6);
});

Deno.test("address-validate: CASS mode is opt-in and returns its own block", async () => {
  const { ctx, calls } = mockCtx([
    rpc({
      result: {
        verdict: { addressComplete: true, validationGranularity: "PREMISE" },
        uspsData: { dpvConfirmation: "Y" },
      },
    }),
  ]);
  const result = await action.execute!({
    addressLines: "x",
    regionCode: "US",
    enableUspsCass: true,
  }, ctx) as { uspsData: { dpvConfirmation: string } };
  assertEquals(JSON.parse(calls[0].body!).enableUspsCass, true);
  assertEquals(result.uspsData.dpvConfirmation, "Y");
});

Deno.test("address-validate: re-validation links to the previous response", async () => {
  const { ctx, calls } = mockCtx([clean]);
  await action.execute!({ addressLines: "x", previousResponseId: "r-1" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).previousResponseId, "r-1");
});

Deno.test("address-validate: structured components are sent when given", async () => {
  const { ctx, calls } = mockCtx([clean]);
  await action.execute!({
    addressLines: "1 High St",
    locality: "Anytown",
    administrativeArea: "CA",
    postalCode: "90210",
    regionCode: "US",
  }, ctx);
  const address = JSON.parse(calls[0].body!).address;
  assertEquals(address.locality, "Anytown");
  assertEquals(address.administrativeArea, "CA");
  assertEquals(address.postalCode, "90210");
});

/** An address is somebody's home. */
Deno.test("address-validate: logs the verdict, never the address", async () => {
  const { ctx, logs } = mockCtx([clean]);
  await action.execute!({ addressLines: "1600 Amphitheatre Pkwy" }, ctx);
  assert(!JSON.stringify(logs).includes("Amphitheatre"), JSON.stringify(logs));
  assertEquals(logs[0].data, {
    deliverable: true,
    validationGranularity: "PREMISE",
    concerns: 0,
  });
});

Deno.test("address-validate: needs an address", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await action.execute!({ addressLines: "  " }, ctx),
    Error,
    "`addressLines` is required",
  );
  assertEquals(calls.length, 0);
});

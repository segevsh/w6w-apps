import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/pickup-buy.ts";

const quoted = (rates: unknown[]) => ({ status: 200, body: { pickup_rates: rates } });
const booked = { status: 200, body: { id: "pkp_1", status: "scheduled", confirmation: "ABC" } };

/** Carriers identify pickup rates by carrier and service, not by id. */
Deno.test("pickup-buy: books a named carrier and service directly", async () => {
  const { ctx, calls } = mockCtx([booked]);
  const result = await action.execute!(
    { pickupId: "pkp_1", carrier: "UPS", service: "Same-day Pickup" },
    ctx,
  ) as { confirmation: string };
  assertEquals(calls[0].url, "https://api.easypost.com/v2/pickups/pkp_1/buy");
  assertEquals(JSON.parse(calls[0].body!), { carrier: "UPS", service: "Same-day Pickup" });
  assertEquals(result.confirmation, "ABC");
});

Deno.test("pickup-buy: with neither given it books the cheapest quoted rate", async () => {
  const { ctx, calls } = mockCtx([
    quoted([
      { rate: "30.00", carrier: "FedEx", service: "Standard" },
      { rate: "9.99", carrier: "UPS", service: "Same-day Pickup" },
    ]),
    booked,
  ]);
  await action.execute!({ pickupId: "pkp_1" }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(JSON.parse(calls[1].body!), { carrier: "UPS", service: "Same-day Pickup" });
});

Deno.test("pickup-buy: a pickup with no rates is refused", async () => {
  const { ctx } = mockCtx([quoted([])]);
  await assertRejects(
    async () => await action.execute!({ pickupId: "pkp_1" }, ctx),
    Error,
    "no rates",
  );
});

Deno.test("pickup-buy: needs a pickup id", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(async () => await action.execute!({}, ctx), Error, "pickupId");
  assertEquals(calls.length, 0);
});

Deno.test("pickup-buy: says this is the step that sends a driver", () => {
  assert(/sends a driver/.test(action.description!), action.description);
});

import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { rpc } from "./_shared.ts";
import action from "../../actions/place-search-nearby.ts";

const two = rpc({ places: [{ id: "a" }, { id: "b" }] });
const twenty = rpc({ places: Array.from({ length: 20 }, (_, i) => ({ id: String(i) })) });

Deno.test("place-search-nearby: the circle is a restriction, not a bias", async () => {
  const { ctx, calls } = mockCtx([two]);
  await action.execute!({ location: "51.5,-0.12", radius: 500 }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.locationRestriction, {
    circle: { center: { latitude: 51.5, longitude: -0.12 }, radius: 500 },
  });
  assertEquals(body.locationBias, undefined);
});

/**
 * There is no page token on this endpoint. Twenty is the whole answer, and
 * saying so is the only warning a caller gets that it was truncated.
 */
Deno.test("place-search-nearby: hitting the ceiling is reported, because there is no next page", async () => {
  const capped = mockCtx([twenty]);
  const cappedResult = await action.execute!({ location: "1,2", radius: 500 }, capped.ctx) as {
    capped: boolean;
    count: number;
  };
  assertEquals(cappedResult.count, 20);
  assertEquals(cappedResult.capped, true);

  const under = mockCtx([two]);
  const underResult = await action.execute!({ location: "1,2", radius: 500 }, under.ctx) as {
    capped: boolean;
  };
  assertEquals(underResult.capped, false);
});

Deno.test("place-search-nearby: the cap is clamped to 20 whatever is asked for", async () => {
  const { ctx, calls } = mockCtx([two]);
  await action.execute!({ location: "1,2", radius: 500, maxResultCount: 100 }, ctx);
  assertEquals(JSON.parse(calls[0].body!).maxResultCount, 20);
});

/** With a hard cap and no paging, the ranking decides WHICH twenty you see. */
Deno.test("place-search-nearby: the rank preference reaches the wire", async () => {
  const { ctx, calls } = mockCtx([two]);
  await action.execute!({ location: "1,2", radius: 500, rankPreference: "DISTANCE" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).rankPreference, "DISTANCE");
});

Deno.test("place-search-nearby: type filters are split into lists", async () => {
  const { ctx, calls } = mockCtx([two]);
  await action.execute!({
    location: "1,2",
    radius: 500,
    includedTypes: "cafe, bakery",
    includedPrimaryTypes: "cafe",
    excludedTypes: "bar",
  }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.includedTypes, ["cafe", "bakery"]);
  assertEquals(body.includedPrimaryTypes, ["cafe"]);
  assertEquals(body.excludedTypes, ["bar"]);
});

Deno.test("place-search-nearby: a missing or unusable radius is refused", async () => {
  for (const radius of [undefined, 0, -5]) {
    const { ctx, calls } = mockCtx([]);
    await assertRejects(
      async () => await action.execute!({ location: "1,2", radius }, ctx),
      Error,
      "positive number of metres",
    );
    assertEquals(calls.length, 0);
  }
});

Deno.test("place-search-nearby: a swapped centre is caught before the request", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(
    async () => await action.execute!({ location: "-122.08,437.42", radius: 500 }, ctx),
    Error,
    "out of range",
  );
});

Deno.test("place-search-nearby: reports the billing tier", async () => {
  const { ctx, logs } = mockCtx([two]);
  const result = await action.execute!({
    location: "1,2",
    radius: 500,
    fieldMask: "places.id,places.reviews",
  }, ctx) as { billingTier: string };
  assertEquals(result.billingTier, "Enterprise + Atmosphere");
  assertEquals(logs[0].data, { count: 2, capped: false, billingTier: "Enterprise + Atmosphere" });
});

Deno.test("place-search-nearby: says the circle excludes and the cap does not page", () => {
  assert(/EXCLUDES everything outside/.test(action.description!), action.description);
  assert(/no paging/.test(action.description!), action.description);
});

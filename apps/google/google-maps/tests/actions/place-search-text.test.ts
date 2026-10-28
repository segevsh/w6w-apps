import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { rpc } from "./_shared.ts";
import action from "../../actions/place-search-text.ts";
import { DEFAULT_PLACE_FIELDS } from "../../lib/fields.ts";

const hits = rpc({
  places: [
    { id: "a", displayName: { text: "Blue Bottle" }, formattedAddress: "1 Main St" },
    { id: "b", displayName: { text: "Kaffe" }, formattedAddress: "2 Main St" },
  ],
});

Deno.test("place-search-text: posts the query with a field mask header", async () => {
  const { ctx, calls } = mockCtx([hits]);
  const result = await action.execute!({ textQuery: "coffee in Shoreditch" }, ctx) as {
    count: number;
  };
  assertEquals(calls[0].url, "https://places.googleapis.com/v1/places:searchText");
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["x-goog-fieldmask"], DEFAULT_PLACE_FIELDS);
  assertEquals(JSON.parse(calls[0].body!).textQuery, "coffee in Shoreditch");
  assertEquals(result.count, 2);
});

/**
 * The mask decides the SKU, and nothing in the response says which. The tier is
 * returned and logged so a change shows up in a run log rather than an invoice.
 */
Deno.test("place-search-text: reports the billing tier the mask bought", async () => {
  const cheap = mockCtx([hits]);
  const cheapResult = await action.execute!({
    textQuery: "x",
    fieldMask: "places.id,places.location",
  }, cheap.ctx) as { billingTier: string };
  assertEquals(cheapResult.billingTier, "Essentials");

  const dear = mockCtx([hits]);
  const dearResult = await action.execute!({
    textQuery: "x",
    fieldMask: "places.id,places.rating",
  }, dear.ctx) as { billingTier: string };
  assertEquals(dearResult.billingTier, "Enterprise");
});

Deno.test("place-search-text: a wildcard mask is reported at the top tier", async () => {
  const { ctx } = mockCtx([hits]);
  const result = await action.execute!({ textQuery: "x", fieldMask: "*" }, ctx) as {
    billingTier: string;
  };
  assertEquals(result.billingTier, "Enterprise + Atmosphere");
});

/** A bias prefers; a restriction excludes. Confusing them changes the results. */
Deno.test("place-search-text: a bias becomes a circle, and a restriction stays a rectangle", async () => {
  const biased = mockCtx([hits]);
  await action.execute!(
    { textQuery: "x", locationBias: "51.5,-0.12", biasRadius: 2000 },
    biased.ctx,
  );
  assertEquals(JSON.parse(biased.calls[0].body!).locationBias, {
    circle: { center: { latitude: 51.5, longitude: -0.12 }, radius: 2000 },
  });

  const restricted = mockCtx([hits]);
  await action.execute!({
    textQuery: "x",
    locationRestriction: '{"rectangle":{"low":{"latitude":51.5,"longitude":-0.2},' +
      '"high":{"latitude":51.6,"longitude":-0.05}}}',
  }, restricted.ctx);
  assert(JSON.parse(restricted.calls[0].body!).locationRestriction.rectangle);
});

Deno.test("place-search-text: optional filters are omitted rather than sent empty", async () => {
  const { ctx, calls } = mockCtx([hits]);
  await action.execute!({ textQuery: "x" }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.openNow, undefined);
  assertEquals(body.minRating, undefined);
  assertEquals(body.includedType, undefined);
});

/** Filtering by rating does not require paying to see it. */
Deno.test("place-search-text: minRating is sent without touching the mask", async () => {
  const { ctx, calls } = mockCtx([hits]);
  const result = await action.execute!({ textQuery: "x", minRating: 4 }, ctx) as {
    billingTier: string;
  };
  assertEquals(JSON.parse(calls[0].body!).minRating, 4);
  assertEquals(result.billingTier, "Pro", "asking for a rating filter is not asking for ratings");
});

Deno.test("place-search-text: the page token is returned for the next call", async () => {
  const { ctx } = mockCtx([rpc({ places: [], nextPageToken: "abc" })]);
  const result = await action.execute!({ textQuery: "x" }, ctx) as { nextPageToken: string };
  assertEquals(result.nextPageToken, "abc");
});

/** A rejected key is a 400 here, not a 401. */
Deno.test("place-search-text: a 400 for a bad key is explained as a credential failure", async () => {
  const { ctx } = mockCtx([
    rpc({
      error: {
        code: 400,
        message: "API key not valid. Please pass a valid API key.",
        details: [{ reason: "API_KEY_INVALID" }],
      },
    }, 400),
  ]);
  const error = await assertRejects(
    async () => await action.execute!({ textQuery: "x" }, ctx),
    Error,
  );
  assert(/CREDENTIAL failure/.test(error.message), error.message);
});

/** The query and the results are the caller's business. */
Deno.test("place-search-text: logs the count and tier, never the places", async () => {
  const { ctx, logs } = mockCtx([hits]);
  await action.execute!({ textQuery: "coffee in Shoreditch" }, ctx);
  assert(!JSON.stringify(logs).includes("Blue Bottle"), JSON.stringify(logs));
  assert(!JSON.stringify(logs).includes("Shoreditch"), JSON.stringify(logs));
  assertEquals(logs[0].data, { count: 2, billingTier: "Pro" });
});

Deno.test("place-search-text: needs a query", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`textQuery` is required");
  assertEquals(calls.length, 0);
});

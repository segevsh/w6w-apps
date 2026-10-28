import { assert, assertEquals } from "@std/assert";
import {
  billingTier,
  DEFAULT_MATRIX_FIELDS,
  DEFAULT_PLACE_DETAIL_FIELDS,
  DEFAULT_PLACE_FIELDS,
  DEFAULT_ROUTE_FIELDS,
  TIERS,
} from "../../lib/fields.ts";

/**
 * The mask is the price control: the tier billed is the highest any named
 * field belongs to, and nothing in the response says which.
 */
Deno.test("billingTier: the highest tier in the mask wins", () => {
  assertEquals(billingTier("places.id"), "Essentials (IDs Only)");
  assertEquals(billingTier("places.id,places.formattedAddress"), "Essentials");
  assertEquals(billingTier("places.id,places.displayName"), "Pro");
  assertEquals(billingTier("places.displayName,places.rating"), "Enterprise");
  assertEquals(billingTier("places.id,places.reviews"), "Enterprise + Atmosphere");
});

/** One added field moves an entire workflow up a tier, silently. */
Deno.test("billingTier: adding places.rating moves Essentials to Enterprise", () => {
  assertEquals(billingTier("places.id,places.location"), "Essentials");
  assertEquals(billingTier("places.id,places.location,places.rating"), "Enterprise");
});

/** Google's own documentation discourages the wildcard in production. */
Deno.test("billingTier: a wildcard bills at the top tier", () => {
  assertEquals(billingTier("*"), TIERS[TIERS.length - 1]);
  assertEquals(billingTier("places.*"), TIERS[TIERS.length - 1]);
});

Deno.test("billingTier: works with and without the places prefix", () => {
  assertEquals(billingTier("displayName"), "Pro");
  assertEquals(billingTier("places.displayName"), "Pro");
  assertEquals(billingTier("place.displayName"), "Pro");
});

/** `places.location.latitude` is still the `location` field. */
Deno.test("billingTier: only the first path segment decides the tier", () => {
  assertEquals(billingTier("places.location.latitude"), "Essentials");
});

/**
 * Google adds fields, and a new one is far more likely to be at the top of the
 * table than the bottom — so an unknown name is assumed expensive.
 */
Deno.test("billingTier: an unrecognised field is assumed expensive, not cheap", () => {
  assertEquals(billingTier("places.somethingNewGoogleAdded"), TIERS[TIERS.length - 1]);
});

Deno.test("billingTier: whitespace and empty entries do not change the answer", () => {
  assertEquals(billingTier(" places.id , , places.location "), "Essentials");
});

/** The defaults have to be cheap, or nobody keeps them. */
Deno.test("the search default stays below Enterprise", () => {
  assertEquals(billingTier(DEFAULT_PLACE_FIELDS), "Pro");
  assertEquals(billingTier(DEFAULT_PLACE_DETAIL_FIELDS), "Pro");
});

Deno.test("the details default carries no places. prefix, which that endpoint rejects", () => {
  assert(!DEFAULT_PLACE_DETAIL_FIELDS.includes("places."), DEFAULT_PLACE_DETAIL_FIELDS);
  assert(DEFAULT_PLACE_FIELDS.startsWith("places."), DEFAULT_PLACE_FIELDS);
});

/**
 * Google's own wording: include `status` "to avoid false success indicators".
 * A matrix element can fail inside a 200.
 */
Deno.test("the matrix default includes status, or a failed pair is invisible", () => {
  assert(DEFAULT_MATRIX_FIELDS.includes("status"), DEFAULT_MATRIX_FIELDS);
  assert(DEFAULT_MATRIX_FIELDS.includes("condition"), DEFAULT_MATRIX_FIELDS);
});

Deno.test("the route default asks for duration and distance, not turn-by-turn steps", () => {
  assert(DEFAULT_ROUTE_FIELDS.includes("routes.duration"), DEFAULT_ROUTE_FIELDS);
  assert(!DEFAULT_ROUTE_FIELDS.includes("steps"), DEFAULT_ROUTE_FIELDS);
});

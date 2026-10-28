import { assertEquals, assertThrows } from "@std/assert";
import { waypoint, waypointKind } from "../../lib/waypoint.ts";

/** A place id is exact and unambiguous — always the best form when one exists. */
Deno.test("waypoint: a place id is recognised in all three spellings", () => {
  const expected = { placeId: "ChIJN1t_tDeuEmsRUsoyG83frY4" };
  assertEquals(waypoint("ChIJN1t_tDeuEmsRUsoyG83frY4", "origin"), expected);
  assertEquals(waypoint("places/ChIJN1t_tDeuEmsRUsoyG83frY4", "origin"), expected);
  assertEquals(waypoint("place_id:ChIJN1t_tDeuEmsRUsoyG83frY4", "origin"), expected);
});

Deno.test("waypoint: two numbers are coordinates, nested the way Routes wants", () => {
  assertEquals(waypoint("51.5,-0.12", "origin"), {
    location: { latLng: { latitude: 51.5, longitude: -0.12 } },
  });
});

/** An address is geocoded by Routes itself — convenient, and silent about ambiguity. */
Deno.test("waypoint: anything else is an address", () => {
  assertEquals(waypoint("10 Downing Street, London", "origin"), {
    address: "10 Downing Street, London",
  });
});

/** A house number and a street would otherwise look like coordinates. */
Deno.test("waypoint: an address containing a comma is not mistaken for a point", () => {
  assertEquals(waypoint("221B Baker Street, London", "origin"), {
    address: "221B Baker Street, London",
  });
});

Deno.test("waypoint: a swapped coordinate pair is still caught", () => {
  assertThrows(() => waypoint("-122.08,437.42", "origin"), Error, "out of range");
});

Deno.test("waypoint: an empty value names the field", () => {
  assertThrows(() => waypoint("", "destination"), Error, "`destination` is required");
});

Deno.test("waypointKind: reports which of the three forms was used", () => {
  assertEquals(waypointKind({ placeId: "x" }), "placeId");
  assertEquals(waypointKind({ location: {} }), "location");
  assertEquals(waypointKind({ address: "x" }), "address");
});

import { assertEquals, assertMatch, assertThrows } from "@std/assert";
import {
  describeError,
  deviceType,
  normalizeRegion,
  regionFromConnection,
} from "../../lib/client.ts";

Deno.test("normalizeRegion: defaults to us, accepts jp, rejects the rest", () => {
  assertEquals(normalizeRegion(undefined), "us");
  assertEquals(normalizeRegion("JP"), "jp");
  assertThrows(() => normalizeRegion("eu"), Error, "region");
});

Deno.test("regionFromConnection: reads display.region", () => {
  assertEquals(regionFromConnection({ display: { region: "jp" } }), "jp");
  assertEquals(regionFromConnection(undefined), "us");
});

Deno.test("deviceType: explicit wins, else derived from the serial prefix", () => {
  assertEquals(deviceType("notepins", "8810000000000001"), "notepins");
  assertEquals(deviceType(undefined, "8810000000000001"), "notepro");
  assertEquals(deviceType("", "8820000000000001"), "notepins");
  assertThrows(() => deviceType(undefined, "9990000000000001"), Error, "derived");
  assertThrows(() => deviceType("watch", "881"), Error, "one of");
});

Deno.test("describeError: reads the body's detail and message, explains 403 and 404", () => {
  assertMatch(describeError(401, '{"detail":"CLIENT_NOT_FOUND"}'), /CLIENT_NOT_FOUND/);
  assertMatch(
    describeError(403, '{"code":403,"message":"device already bound"}'),
    /another account/,
  );
  assertMatch(describeError(404, ""), /bare 404/);
  assertEquals(describeError(500, "boom"), "boom");
});

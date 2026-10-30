import { denoReadTextFile } from "../_deno.ts";
import { test } from "node:test";
import { assert, assertEquals, assertThrows } from "../_assert.ts";
import {
  compact,
  csv,
  describeError,
  hostFor,
  NETWORK_ALLOW,
  regionFor,
  REGIONS,
} from "../../lib/client.ts";

test("REGIONS: enumerates exactly the ten hosts the v1 API reference documents", () => {
  const hosts = REGIONS.map((r) => r.apiHost).sort();
  assertEquals(hosts, [
    "rest.ap.zuora.com",
    "rest.apisandbox.zuora.com",
    "rest.eu.zuora.com",
    "rest.na.zuora.com",
    "rest.sandbox.eu.zuora.com",
    "rest.sandbox.na.zuora.com",
    "rest.test.ap.zuora.com",
    "rest.test.eu.zuora.com",
    "rest.test.zuora.com",
    "rest.zuora.com",
  ]);
});

test("NETWORK_ALLOW: matches package.json's w6w.network.allow exactly", async () => {
  const pkg = JSON.parse(
    await denoReadTextFile(new URL("../../package.json", import.meta.url)),
  ) as { w6w: { network: { allow: string[] } } };
  assertEquals(new Set(NETWORK_ALLOW), new Set(pkg.w6w.network.allow));
  assertEquals(NETWORK_ALLOW.length, pkg.w6w.network.allow.length);
});

test("hostFor: resolves a region key to https://<host>", () => {
  assertEquals(hostFor("eu"), "https://rest.eu.zuora.com");
  assertEquals(hostFor(undefined), "https://rest.zuora.com", "defaults to US Production Cloud 2");
});

test("hostFor: refuses an unknown region by name", () => {
  assertThrows(() => hostFor("mars"), Error, "unknown Zuora region `mars`");
});

test("regionFor: round-trips every declared region key", () => {
  for (const r of REGIONS) {
    assertEquals(regionFor(r.key).apiHost, r.apiHost);
  }
});

test("compact: drops undefined, null and empty-string values only", () => {
  assertEquals(compact({ a: 1, b: undefined, c: null, d: "", e: 0, f: false }), {
    a: 1,
    e: 0,
    f: false,
  });
});

test("csv: splits and trims a comma-separated field", () => {
  assertEquals(csv("a, b ,c"), ["a", "b", "c"]);
  assertEquals(csv(""), undefined);
  assertEquals(csv(undefined), undefined);
});

test("describeError: extracts the v1 `reasons` shape", () => {
  const body = JSON.stringify({
    success: false,
    processId: "p1",
    reasons: [{ code: 53100320, message: "'termType' value should be one of: TERMED, EVERGREEN" }],
  });
  const msg = describeError(400, body);
  assert(msg.includes("53100320"));
  assert(msg.includes("termType"));
});

test("describeError: extracts the Object Query `reasons` shape (no `success` field)", () => {
  const body = JSON.stringify({
    reasons: [{ code: 500000, message: "unknown field" }],
    requestId: "r1",
  });
  const msg = describeError(500, body);
  assert(msg.includes("500000"));
});

test("describeError: annotates 401 and 429 with the rate/token explanation", () => {
  assert(/token/i.test(describeError(401, "{}")));
  assert(/concurrency|rate/i.test(describeError(429, "{}")));
});

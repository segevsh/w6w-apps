import { test } from "node:test";
import { assertEquals, assertThrows } from "../_assert.ts";
import { isKnownRegion, S3_REGIONS, s3Host } from "../../lib/regions.ts";

test("regions: s3Host builds the path-style regional endpoint", () => {
  assertEquals(s3Host("us-east-1"), "s3.us-east-1.amazonaws.com");
  assertEquals(s3Host("eu-west-1"), "s3.eu-west-1.amazonaws.com");
});

test("regions: s3Host throws a descriptive error for an unknown region", () => {
  assertThrows(() => s3Host("mars-1"), Error, "Unknown AWS region");
});

test("regions: isKnownRegion matches S3_REGIONS exactly", () => {
  for (const r of S3_REGIONS) assertEquals(isKnownRegion(r), true);
  assertEquals(isKnownRegion("not-a-region"), false);
});

test("regions: every region is unique", () => {
  assertEquals(new Set(S3_REGIONS).size, S3_REGIONS.length);
});

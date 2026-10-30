import { test } from "node:test";
import { assertEquals, assertThrows } from "../_assert.ts";
import { hostFromConnection, regionFromConnection } from "../../lib/connection.ts";
import { mockConnection } from "../_helpers.ts";

test("connection: regionFromConnection reads display.region", () => {
  assertEquals(regionFromConnection(mockConnection({ region: "eu-west-1" })), "eu-west-1");
});

test("connection: regionFromConnection throws a clear error when absent", () => {
  assertThrows(() => regionFromConnection(undefined), Error, "Reconnect");
  assertThrows(() => regionFromConnection(mockConnection({})), Error, "Reconnect");
});

test("connection: hostFromConnection composes region -> host", () => {
  assertEquals(
    hostFromConnection(mockConnection({ region: "ap-southeast-2" })),
    "s3.ap-southeast-2.amazonaws.com",
  );
});

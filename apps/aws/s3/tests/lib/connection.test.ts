import { assertEquals, assertThrows } from "@std/assert";
import { hostFromConnection, regionFromConnection } from "../../lib/connection.ts";
import { mockConnection } from "../_helpers.ts";

Deno.test("connection: regionFromConnection reads display.region", () => {
  assertEquals(regionFromConnection(mockConnection({ region: "eu-west-1" })), "eu-west-1");
});

Deno.test("connection: regionFromConnection throws a clear error when absent", () => {
  assertThrows(() => regionFromConnection(undefined), Error, "Reconnect");
  assertThrows(() => regionFromConnection(mockConnection({})), Error, "Reconnect");
});

Deno.test("connection: hostFromConnection composes region -> host", () => {
  assertEquals(
    hostFromConnection(mockConnection({ region: "ap-southeast-2" })),
    "s3.ap-southeast-2.amazonaws.com",
  );
});

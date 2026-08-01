import { assertEquals } from "@std/assert";
import { apiHost, baseUrl, compact, csv, regionFromConnection, unset } from "../../lib/client.ts";
import type { RedactedConnection } from "@w6w/types";

/** A `RedactedConnection` carrying only the `display` fields a test needs. */
function conn(display: Record<string, unknown>): RedactedConnection {
  return { display } as unknown as RedactedConnection;
}

Deno.test("apiHost: us and eu map to the two Mailgun hosts", () => {
  assertEquals(apiHost("us"), "api.mailgun.net");
  assertEquals(apiHost("eu"), "api.eu.mailgun.net");
});

Deno.test("regionFromConnection: reads display.region, defaults to us", () => {
  assertEquals(regionFromConnection(undefined), "us");
  assertEquals(regionFromConnection(conn({})), "us");
  assertEquals(regionFromConnection(conn({ region: "eu" })), "eu");
  assertEquals(regionFromConnection(conn({ region: "us" })), "us");
  // Anything other than the literal "eu" is treated as US — never silently
  // routes a request to the wrong regional host.
  assertEquals(regionFromConnection(conn({ region: "bogus" })), "us");
});

Deno.test("baseUrl: composes the host from the connection's region", () => {
  assertEquals(baseUrl(undefined), "https://api.mailgun.net");
  assertEquals(baseUrl(conn({ region: "eu" })), "https://api.eu.mailgun.net");
});

Deno.test("compact: drops undefined, null and empty-string values", () => {
  assertEquals(compact({ a: "x", b: undefined, c: null, d: "", e: 0, f: false }), {
    a: "x",
    e: 0,
    f: false,
  });
});

Deno.test("unset: treats a blank string as absent", () => {
  assertEquals(unset(""), undefined);
  assertEquals(unset("x"), "x");
  assertEquals(unset(undefined), undefined);
});

Deno.test("csv: splits, trims and drops empties; blank input is unset", () => {
  assertEquals(csv("a, b ,,c"), ["a", "b", "c"]);
  assertEquals(csv(""), undefined);
  assertEquals(csv(undefined), undefined);
});

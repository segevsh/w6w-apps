import { assert, assertEquals, assertRejects } from "@std/assert";
import type { RedactedConnection } from "@w6w/types";
import { mockCtx } from "../_helpers.ts";
import {
  asJson,
  asJsonOptional,
  baseUrlFor,
  baseUrlFromConnection,
  compact,
  DocuSealClient,
  formatDocuSealError,
  HOSTS,
  regionFromConnection,
  regionOf,
} from "../../lib/client.ts";

Deno.test("regionOf: normalises to the two real regions, defaulting to global", () => {
  assertEquals(regionOf("eu"), "eu");
  assertEquals(regionOf("EU"), "eu");
  assertEquals(regionOf("global"), "global");
  assertEquals(regionOf(undefined), "global");
  assertEquals(regionOf("nonsense"), "global");
});

Deno.test("baseUrlFor: resolves to the two documented hosts", () => {
  assertEquals(baseUrlFor("global"), `https://${HOSTS.global}`);
  assertEquals(baseUrlFor("eu"), `https://${HOSTS.eu}`);
  assertEquals(HOSTS.global, "api.docuseal.com");
  assertEquals(HOSTS.eu, "api.docuseal.eu");
});

const withRegion = (region: string | undefined) =>
  ({ display: { region } }) as unknown as RedactedConnection;

Deno.test("regionFromConnection / baseUrlFromConnection: read the region afterConnect recorded", () => {
  assertEquals(regionFromConnection(withRegion("eu")), "eu");
  assertEquals(regionFromConnection(undefined), "global");
  assertEquals(baseUrlFromConnection(withRegion("eu")), "https://api.docuseal.eu");
});

Deno.test("compact: drops undefined/null/empty string, keeps false and 0", () => {
  assertEquals(
    compact({ a: undefined, b: null, c: "", d: false, e: 0, f: "x" }),
    { d: false, e: 0, f: "x" },
  );
});

Deno.test("asJson: parses a JSON string, passes through a live value, rejects garbage", () => {
  assertEquals(asJson('{"a":1}', "field"), { a: 1 });
  assertEquals(asJson([1, 2], "field"), [1, 2]);
  assertEquals(asJson({ a: 1 }, "field"), { a: 1 });
  let threw = false;
  try {
    asJson("not json", "field");
  } catch (err) {
    threw = true;
    assert(String((err as Error).message).includes("not valid JSON"));
  }
  assert(threw);
  let threwRequired = false;
  try {
    asJson("", "field");
  } catch {
    threwRequired = true;
  }
  assert(threwRequired);
});

Deno.test("asJsonOptional: an unset value is simply omitted, not an error", () => {
  assertEquals(asJsonOptional(undefined, "field"), undefined);
  assertEquals(asJsonOptional("", "field"), undefined);
  assertEquals(asJsonOptional('{"a":1}', "field"), { a: 1 });
});

Deno.test("formatDocuSealError: reads the vendor's own error body, never just the status", () => {
  const msg = formatDocuSealError(
    401,
    "GET",
    "/templates",
    JSON.stringify({ error: "Not authenticated" }),
  );
  assertEquals(msg, "DocuSeal 401 for GET /templates: Not authenticated");
});

Deno.test("formatDocuSealError: falls back to the raw body when it isn't the documented shape", () => {
  const msg = formatDocuSealError(500, "GET", "/templates", "internal error");
  assertEquals(msg, "DocuSeal 500 for GET /templates: internal error");
});

Deno.test("DocuSealClient: resolves the base URL from the connection's region, and never signs itself", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [] } }], {
    display: { region: "eu" },
  });
  const client = new DocuSealClient(ctx);
  assertEquals(client.base, "https://api.docuseal.eu");
  await client.request("/templates");
  assertEquals(calls[0].url, "https://api.docuseal.eu/templates");
  assert(!("x-auth-token" in calls[0].headers), "the client must never set the auth header itself");
});

Deno.test("DocuSealClient.request: a non-ok response throws with the vendor's own error message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { error: "Not authenticated" } }]);
  await assertRejects(
    () => new DocuSealClient(ctx).request("/templates"),
    Error,
    "Not authenticated",
  );
});

Deno.test("DocuSealClient.requestAll: follows the `after` cursor until `pagination.next` is null", async () => {
  const { ctx, calls } = mockCtx([
    {
      status: 200,
      body: { data: [{ id: 1 }, { id: 2 }], pagination: { count: 2, next: 2, prev: null } },
    },
    { status: 200, body: { data: [{ id: 3 }], pagination: { count: 1, next: null, prev: 1 } } },
  ]);
  const items = await new DocuSealClient(ctx).requestAll("/templates");
  assertEquals(items, [{ id: 1 }, { id: 2 }, { id: 3 }]);
  assertEquals(new URL(calls[0].url).searchParams.get("after"), null);
  assertEquals(new URL(calls[1].url).searchParams.get("after"), "2");
});

Deno.test("DocuSealClient.requestAll: stops at wantTotal without an extra request", async () => {
  const { ctx, calls } = mockCtx([
    {
      status: 200,
      body: { data: [{ id: 1 }, { id: 2 }], pagination: { count: 2, next: 2, prev: null } },
    },
  ]);
  const items = await new DocuSealClient(ctx).requestAll("/templates", {}, 2);
  assertEquals(items, [{ id: 1 }, { id: 2 }]);
  assertEquals(calls.length, 1);
});

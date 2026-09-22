import { assert, assertEquals } from "@std/assert";
import type { RedactedConnection } from "@w6w/types";
import { EU, mockCtx, pathOf, queryOf, US } from "../_helpers.ts";
import {
  baseUrl,
  csvParam,
  DudaClient,
  jsonParam,
  regionFromConnection,
  regionOf,
  request,
  USER_AGENT,
} from "../../lib/client.ts";

Deno.test("client: the two documented hosts, and US as the default", () => {
  assertEquals(baseUrl("US"), US);
  assertEquals(baseUrl("EU"), EU);
  assertEquals(baseUrl("us"), US);
  assertEquals(baseUrl("eu"), EU);
  assertEquals(baseUrl(undefined), US);
  assertEquals(baseUrl("apac"), US);
});

Deno.test("client: regionOf normalises case and fallback", () => {
  assertEquals(regionOf("EU"), "EU");
  assertEquals(regionOf(" eu "), "EU");
  assertEquals(regionOf("US"), "US");
  assertEquals(regionOf(undefined), "US");
  assertEquals(regionOf(null), "US");
});

Deno.test("client: the region comes off the connection's redacted display", () => {
  const withRegion = (region: unknown) =>
    ({ display: { region } }) as unknown as RedactedConnection;

  assertEquals(regionFromConnection(withRegion("EU")), "EU");
  // A connection with no recorded region resolves to Duda's documented default
  // rather than throwing mid-Action.
  assertEquals(regionFromConnection(undefined), "US");
  assertEquals(regionFromConnection(withRegion(undefined)), "US");
});

Deno.test("client: request builds the URL, query and JSON body", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true } }]);
  const res = await request(ctx, "EU", "/api/thing", {
    method: "POST",
    query: { limit: 5, flag: undefined, empty: "" },
    body: { a: 1 },
  });

  assertEquals(res.status, 200);
  assertEquals(res.data, { ok: true });
  assertEquals(calls[0].url, `${EU}/api/thing?limit=5`);
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].headers["user-agent"], USER_AGENT);
  assertEquals(calls[0].headers["accept"], "application/json");
  // The client never signs anything.
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(JSON.parse(calls[0].body!), { a: 1 });
});

Deno.test("client: a JSON array body is sent as the body, not wrapped", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: "1" }] }]);
  await request(ctx, "US", "/api/rows", { method: "POST", body: [{ data: { A: 1 } }] });
  assertEquals(JSON.parse(calls[0].body!), [{ data: { A: 1 } }]);
});

Deno.test("client: 204 and empty 200 bodies both come back as undefined", async () => {
  const { ctx } = mockCtx([{ status: 204 }, { status: 200, body: "" }]);
  const first = await request(ctx, "US", "/api/a", { method: "POST" });
  const second = await request(ctx, "US", "/api/b");
  assertEquals(first, { status: 204, data: undefined });
  assertEquals(second.status, 200);
  assertEquals(second.data, undefined);
});

/**
 * The empty-body 401, reproduced: this is the failure the whole app has to get
 * right, and there is nothing in the body to read.
 */
Deno.test("client: an empty-body 401 throws the status line and nothing more", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    headers: { "www-authenticate": 'Basic realm="DM API"' },
  }]);
  const err = await request(ctx, "US", "/api/sites/multiscreen").catch((e: Error) => e);
  assertEquals((err as Error).message, "Duda 401 for GET /api/sites/multiscreen");
});

Deno.test("client: a non-401 error surfaces Duda's own error_code and message", async () => {
  const { ctx } = mockCtx([{
    status: 402,
    body: { error_code: "InsufficientCredits", message: "Not enough credits" },
  }]);
  const err = await request(ctx, "US", "/api/sites/multiscreen/create", { method: "POST" })
    .catch((e: Error) => e);
  assertEquals(
    (err as Error).message,
    "Duda 402 for POST /api/sites/multiscreen/create: InsufficientCredits: Not enough credits",
  );
});

Deno.test("client: an unrecognised error body still yields the status line", async () => {
  const { ctx } = mockCtx([{ status: 400, body: "<html>nope</html>" }]);
  const err = await request(ctx, "US", "/api/accounts/create", { method: "POST" })
    .catch((e: Error) => e);
  assertEquals((err as Error).message, "Duda 400 for POST /api/accounts/create");
});

/**
 * Duda publishes no rate-limit header, so a 429 is the only signal there is —
 * and it should say what the limits actually are.
 */
Deno.test("client: a 429 names the documented ceilings", async () => {
  const { ctx } = mockCtx([{ status: 429 }]);
  const err = await request(ctx, "US", "/api/sites/multiscreen").catch((e: Error) => e);
  const message = (err as Error).message;
  assert(message.includes("10 calls/second"), message);
  assert(message.includes("300/min for form submissions"), message);
});

Deno.test("client: a non-JSON 200 body is an error, not a silent undefined", async () => {
  const { ctx } = mockCtx([{ status: 200, body: "<html>hello</html>" }]);
  const err = await request(ctx, "US", "/api/x").catch((e: Error) => e);
  assert(/did not return JSON/.test((err as Error).message), (err as Error).message);
});

Deno.test("client: the DudaClient reads the region from the connection", async () => {
  const { ctx, calls } = mockCtx([{ body: { results: [] } }], { display: { region: "EU" } });
  const client = new DudaClient(ctx);
  assertEquals(client.region, "EU");
  const body = await client.request<{ results: unknown[] }>("/api/sites/multiscreen");
  assertEquals(body.results, []);
  assertEquals(new URL(calls[0].url).origin, EU);
  assertEquals(pathOf(calls[0].url), "/api/sites/multiscreen");
  assertEquals(queryOf(calls[0].url), {});
});

Deno.test("client: helpers compact, csv and parse what the params hand them", () => {
  assertEquals(csvParam("PUBLISHED,UNPUBLISHED"), "PUBLISHED,UNPUBLISHED");
  assertEquals(csvParam(["PUBLISHED", "UNPUBLISHED"]), "PUBLISHED,UNPUBLISHED");
  assertEquals(csvParam(""), undefined);
  assertEquals(csvParam(undefined), undefined);
  assertEquals(jsonParam('{"a":1}', "rows"), { a: 1 });
  assertEquals(jsonParam({ a: 1 }, "rows"), { a: 1 });
  assertEquals(jsonParam([1, 2], "rows"), [1, 2]);
});

import { assert, assertEquals, assertThrows } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import {
  API_HOST,
  compact,
  csv,
  describeError,
  DigitalOceanClient,
  json,
  numericId,
  parseRateLimit,
  query,
} from "../../lib/client.ts";

Deno.test("the API host", () => {
  assertEquals(API_HOST, "https://api.digitalocean.com");
});

/** Droplets are numbers; volumes and databases are UUIDs. */
Deno.test("numericId: refuses a UUID where a number belongs, and says why", () => {
  assertEquals(numericId("3164444", "dropletId"), 3164444);
  const err = assertThrows(
    () => numericId("506f78a4-e098-11e5-ad9f-000f53306ae1", "dropletId"),
    Error,
  );
  assert(/must be a numeric id/.test(err.message), err.message);
  assert(/404 rather than a validation error/.test(err.message), err.message);
  assertThrows(() => numericId("", "dropletId"), Error, "required");
});

/** The auth hook signs; the client must never carry a token. */
Deno.test("request: never sets an authorization header", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { droplets: [] } }]);
  await new DigitalOceanClient(ctx).request("/v2/droplets");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(calls[0].url, "https://api.digitalocean.com/v2/droplets");
});

Deno.test("request: a 204 returns undefined rather than throwing", async () => {
  const { ctx } = mockCtx([{ status: 204 }]);
  assertEquals(
    await new DigitalOceanClient(ctx).request("/v2/droplets/1", { method: "DELETE" }),
    undefined,
  );
});

/** The array is one page; meta.total is how many exist. */
Deno.test("list: separates the page from the total, and carries the next link", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: {
      droplets: [{ id: 1 }, { id: 2 }],
      meta: { total: 57 },
      links: { pages: { next: "https://api.digitalocean.com/v2/droplets?page=2" } },
    },
  }]);
  const page = await new DigitalOceanClient(ctx).list("/v2/droplets", "droplets");
  assertEquals(page.items.length, 2);
  assertEquals(page.total, 57, "not the array's length");
  assert(page.nextPage?.includes("page=2"), page.nextPage);
});

Deno.test("list: a missing key or a non-array is an empty page, not an error", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { meta: { total: 0 } } }]);
  const page = await new DigitalOceanClient(ctx).list("/v2/droplets", "droplets");
  assertEquals(page.items, []);
  assertEquals(page.nextPage, undefined);
});

/** Unlike most of this pack, the reset is a Unix timestamp. */
Deno.test("parseRateLimit: reads the reset as a timestamp, not a duration", () => {
  const headers = new Headers({
    "ratelimit-limit": "5000",
    "ratelimit-remaining": "4987",
    "ratelimit-reset": "1785500000",
  });
  const limit = parseRateLimit(headers);
  assertEquals(limit.limit, 5000);
  assertEquals(limit.remaining, 4987);
  assertEquals(limit.resetsAt, 1785500000);
  assert(limit.resetsAt! > 1_000_000_000, "seconds since the epoch, not seconds from now");
});

/** Verified: an unauthenticated 401 carries no rate-limit headers. */
Deno.test("parseRateLimit: absent headers give undefined rather than zero", () => {
  assertEquals(parseRateLimit(new Headers()), {
    limit: undefined,
    remaining: undefined,
    resetsAt: undefined,
  });
});

Deno.test("full: surfaces the rate limit alongside the body", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: { account: {} },
    headers: {
      "content-type": "application/json",
      "ratelimit-limit": "5000",
      "ratelimit-remaining": "10",
    },
  }]);
  const result = await new DigitalOceanClient(ctx).full("/v2/account");
  assertEquals(result.rateLimit.remaining, 10);
});

Deno.test("compact, csv, json and query behave as the actions assume", () => {
  assertEquals(compact({ a: 1, b: "", c: undefined, d: [] }), { a: 1 });
  assertEquals(csv("a, b"), ["a", "b"]);
  assertEquals(csv(""), undefined);
  assertEquals(json('{"a":1}', "x"), { a: 1 });
  assertThrows(() => json("{oops", "x"), Error, "`x` is not valid JSON");
  assertEquals(query({ a: "x", b: 2, c: "" }), { a: "x", b: 2 });
});

/** A read-only token looks like a working one until the first write. */
Deno.test("describeError: 401 and 403 both name the read-only token", () => {
  const unauthorized = describeError(401, JSON.stringify({ id: "unauthorized", message: "no" }));
  assert(/scoped read-only/.test(unauthorized), unauthorized);
  const forbidden = describeError(403, JSON.stringify({ id: "forbidden", message: "no" }));
  assert(/READ-ONLY token looks exactly like a working one/.test(forbidden), forbidden);
});

Deno.test("describeError: keeps the id and the request id", () => {
  const message = describeError(
    404,
    JSON.stringify({
      id: "not_found",
      message: "The resource you were accessing could not be found.",
      request_id: "abc",
    }),
  );
  assert(/\[not_found\]/.test(message), message);
  assert(/request abc/.test(message), message);
  assert(/numeric ids while volumes/.test(message), message);
});

/** The reset is a timestamp, and the message says so. */
Deno.test("describeError: 422 and 429 explain themselves", () => {
  assert(/availability differs by account/.test(describeError(422, "{}")));
  const limited = describeError(429, "{}");
  assert(/5,000 requests an hour/.test(limited), limited);
  assert(/Unix TIMESTAMP/.test(limited), limited);
});

Deno.test("request: an error names the method, the path and the explanation", async () => {
  const { ctx } = mockCtx([{ status: 403, body: { id: "forbidden", message: "no" } }]);
  let message = "";
  try {
    await new DigitalOceanClient(ctx).request("/v2/droplets", { method: "POST", body: {} });
  } catch (err) {
    message = String(err);
  }
  assert(/403/.test(message), message);
  assert(/POST \/v2\/droplets/.test(message), message);
});

import { assertEquals, assertRejects } from "@std/assert";
import {
  describeError,
  errorCode,
  nextCursor,
  OutreachClient,
  OutreachError,
  relationship,
  requireId,
  stripWebhookSecrets,
} from "../../lib/client.ts";
import { filterQuery } from "../../lib/factory.ts";
import { mockCtx, queryOf } from "../_helpers.ts";

Deno.test("client: every request carries the JSON:API media type, even a read", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  await new OutreachClient(ctx).send("GET", "/prospects");
  assertEquals(calls[0].headers["content-type"], "application/vnd.api+json");
  assertEquals(calls[0].headers["accept"], "application/vnd.api+json");
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("client: empty and undefined query values are dropped", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  await new OutreachClient(ctx).send("GET", "/x", { query: { a: "1", b: "", c: undefined, d: 0 } });
  assertEquals(queryOf(calls[0].url), { a: "1", d: "0" });
});

Deno.test("client: a 204 yields null", async () => {
  const { ctx } = mockCtx([{ status: 204 }]);
  assertEquals(await new OutreachClient(ctx).send("DELETE", "/prospects/1"), null);
});

Deno.test("client: JSON:API error becomes OutreachError with status and code", async () => {
  const { ctx } = mockCtx([{
    status: 429,
    body: {
      errors: [{ id: "rateLimitExceeded", title: "Rate Limit Exceeded", detail: "Slow down." }],
    },
  }]);
  const err = await assertRejects(
    () => new OutreachClient(ctx).send("GET", "/prospects"),
    OutreachError,
    "rateLimitExceeded: Slow down.",
  );
  assertEquals(err.status, 429);
  assertEquals(err.code, "rateLimitExceeded");
});

Deno.test("client: the gateway's bare {error, description} shape is understood too", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { error: "Invalid JWT token.", description: "The JWT token could not be decoded." },
  }]);
  await assertRejects(
    () => new OutreachClient(ctx).send("GET", "/prospects"),
    OutreachError,
    "Outreach 401: Invalid JWT token. The JWT token could not be decoded.",
  );
});

Deno.test("client: a non-JSON error body still yields the status", async () => {
  const { ctx } = mockCtx([{ status: 502, body: "<html>Bad gateway</html>" }]);
  await assertRejects(
    () => new OutreachClient(ctx).send("GET", "/prospects"),
    OutreachError,
    "HTTP 502",
  );
});

Deno.test("describeError / errorCode: both shapes and neither", () => {
  assertEquals(errorCode({ errors: [{ id: "x" }] }), "x");
  assertEquals(errorCode({ error: "y" }), undefined);
  assertEquals(describeError(500, null), "Outreach returned HTTP 500");
  // The documented 415 body spells the field `details`, not `detail`.
  assertEquals(
    describeError(415, {
      errors: [{
        id: "unsupportedMediaType",
        title: "Unsupported Media Type",
        details: "Expected Content-Type header to be 'application/vnd.api+json'.",
      }],
    }),
    "Outreach 415 unsupportedMediaType: Expected Content-Type header to be 'application/vnd.api+json'.",
  );
});

Deno.test("nextCursor: reads page[after] from links.next, undefined at the end", () => {
  assertEquals(
    nextCursor({
      next: "https://api.outreach.io/api/v2/prospects?page[size]=50&page[after]=eyJjbiI6I",
    }),
    "eyJjbiI6I",
  );
  assertEquals(nextCursor({ first: "https://api.outreach.io/api/v2/prospects" }), undefined);
  assertEquals(nextCursor({ next: "not a url" }), undefined);
  assertEquals(nextCursor(undefined), undefined);
});

Deno.test("requireId: accepts positive integers and digit strings only", () => {
  assertEquals(requireId(7), 7);
  assertEquals(requireId("12"), 12);
  for (const bad of [0, -3, 1.5, "1/../2", "", null, undefined, "abc"]) {
    let threw = false;
    try {
      requireId(bad);
    } catch {
      threw = true;
    }
    assertEquals(threw, true, `expected ${JSON.stringify(bad)} to be refused`);
  }
});

Deno.test("relationship: builds a to-one identifier with an integer id", () => {
  assertEquals(relationship("account", "5"), { data: { type: "account", id: 5 } });
});

Deno.test("stripWebhookSecrets: scrubs a collection and a single resource, nothing else", () => {
  const list = stripWebhookSecrets({
    data: [
      { attributes: { url: "u", secret: "a", cleanupToken: "b" } },
      { attributes: { url: "v" } },
    ],
  });
  assertEquals(list.data, [{ attributes: { url: "u" } }, { attributes: { url: "v" } }]);
  const one = stripWebhookSecrets<{ data: { attributes: Record<string, unknown> } }>({
    data: { attributes: { secret: "a", active: true } },
  });
  assertEquals(one.data, { attributes: { active: true } });
  assertEquals(stripWebhookSecrets(null), null);
});

Deno.test("filterQuery: scalars, lists, nested relationship filters, junk", () => {
  assertEquals(
    filterQuery({ a: "1", b: [1, 2], c: { id: 3 }, d: null, e: false }),
    { "filter[a]": "1", "filter[b]": "1,2", "filter[c][id]": "3", "filter[e]": "false" },
  );
  assertEquals(filterQuery(undefined), {});
  assertEquals(filterQuery("  "), {});
});

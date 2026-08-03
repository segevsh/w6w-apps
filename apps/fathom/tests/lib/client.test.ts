import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx, page } from "../_helpers.ts";
import { API_BASE, compact, FathomClient, readRateLimit } from "../../lib/client.ts";

Deno.test("client: builds URLs against the documented base", () => {
  assertEquals(API_BASE, "https://api.fathom.ai/external/v1");
  const url = new URL(FathomClient.url("/meetings"));
  assertEquals(url.host, "api.fathom.ai");
  assertEquals(url.pathname, "/external/v1/meetings");
});

Deno.test("client: expands array params into the `key[]=v` form, once per value", () => {
  const url = new URL(
    FathomClient.url("/meetings", { recorded_by: ["ceo@acme.com", "pm@acme.com"] }),
  );
  assertEquals(url.searchParams.getAll("recorded_by[]"), ["ceo@acme.com", "pm@acme.com"]);
  assertEquals(url.searchParams.get("recorded_by"), null);
});

Deno.test("client: drops unset query params but keeps `false`", () => {
  const url = new URL(
    FathomClient.url("/meetings", {
      cursor: undefined,
      team: "",
      status: null,
      include_summary: false,
    }),
  );
  assertEquals(url.searchParams.get("cursor"), null);
  assertEquals(url.searchParams.get("team"), null);
  assertEquals(url.searchParams.get("status"), null);
  assertEquals(url.searchParams.get("include_summary"), "false");
});

Deno.test("client: list unwraps the cursor envelope", async () => {
  const { ctx } = mockCtx([{ body: page([{ recording_id: 1 }], "eyJwYWdlIjoyfQ==", 10) }]);
  const result = await new FathomClient(ctx).list("/meetings");
  assertEquals(result, {
    items: [{ recording_id: 1 }],
    nextCursor: "eyJwYWdlIjoyfQ==",
    limit: 10,
  });
});

Deno.test("client: list tolerates a missing envelope", async () => {
  const { ctx } = mockCtx([{ body: {} }]);
  assertEquals(await new FathomClient(ctx).list("/teams"), {
    items: [],
    nextCursor: null,
    limit: null,
  });
});

Deno.test("client: never sets an auth header — `sign` does that", async () => {
  const { ctx, calls } = mockCtx([{ body: page([]) }]);
  await new FathomClient(ctx).list("/meetings");
  assertEquals(calls[0].headers["x-api-key"], undefined);
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("client: JSON-encodes a body and sets content-type", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "abc" } }]);
  await new FathomClient(ctx).request("/webhooks", {
    method: "POST",
    body: { destination_url: "https://example.com/webhook" },
  });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), { destination_url: "https://example.com/webhook" });
});

Deno.test("client: a 204 yields undefined rather than a parse error", async () => {
  const { ctx } = mockCtx([{ status: 204 }]);
  assertEquals(
    await new FathomClient(ctx).request("/webhooks/abc", { method: "DELETE" }),
    undefined,
  );
});

Deno.test("client: a non-2xx throws with the status and body", async () => {
  const { ctx } = mockCtx([{ status: 403, body: "Forbidden" }]);
  const err = await assertRejects(async () => await new FathomClient(ctx).request("/users"));
  assert(err instanceof Error);
  assert(err.message.includes("403"));
  assert(err.message.includes("/external/v1/users"));
});

Deno.test("client: a non-JSON 200 body throws rather than being swallowed", async () => {
  const { ctx } = mockCtx([{
    body: "<html>nope</html>",
    headers: { "content-type": "text/html" },
  }]);
  await assertRejects(async () => await new FathomClient(ctx).request("/meetings"));
});

Deno.test("compact: drops undefined, null, empty strings and empty arrays", () => {
  assertEquals(
    compact({ a: 1, b: undefined, c: null, d: "", e: [], f: false, g: ["x"] }),
    { a: 1, f: false, g: ["x"] },
  );
});

Deno.test("readRateLimit: reads Fathom's documented headers case-insensitively", () => {
  const reading = readRateLimit(
    new Headers({
      "ratelimit-limit": "60",
      "RateLimit-Remaining": "42",
      "RateLimit-Reset": "17",
      "retry-after": "5",
    }),
  );
  assertEquals(reading, { limit: 60, remaining: 42, resetSeconds: 17, retryAfterSeconds: 5 });
});

Deno.test("readRateLimit: absent or unparseable headers read as undefined", () => {
  assertEquals(readRateLimit(new Headers({ "RateLimit-Limit": "soon" })), {
    limit: undefined,
    remaining: undefined,
    resetSeconds: undefined,
    retryAfterSeconds: undefined,
  });
});

import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import {
  API_VERSION,
  compact,
  companyIdFrom,
  csv,
  describeError,
  GustoClient,
  hostFor,
} from "../../lib/client.ts";

const conn = { display: { environment: "production", companyId: "co-1" } };
const demo = { display: { environment: "demo", companyId: "co-1" } };

/** Without the header Gusto serves a version deprecated in 2024. */
Deno.test("client: pins the API version header on every request", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], conn);
  await new GustoClient(ctx).request("/v1/token_info");
  assertEquals(calls[0].headers["x-gusto-api-version"], API_VERSION);
  assertEquals(API_VERSION, "2026-06-15");
});

Deno.test("hostFor: demo and production are different installations", () => {
  assertEquals(hostFor("production"), "https://api.gusto.com");
  assertEquals(hostFor("demo"), "https://api.gusto-demo.com");
  assertEquals(hostFor(undefined), "https://api.gusto.com");
});

Deno.test("client: the connection's environment decides the host", async () => {
  const p = mockCtx([{ status: 200, body: {} }], conn);
  await new GustoClient(p.ctx).request("/v1/token_info");
  assertEquals(new URL(p.calls[0].url).host, "api.gusto.com");

  const d = mockCtx([{ status: 200, body: {} }], demo);
  await new GustoClient(d.ctx).request("/v1/token_info");
  assertEquals(new URL(d.calls[0].url).host, "api.gusto-demo.com");
});

Deno.test("client: paging stops on a short page", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: Array.from({ length: 100 }, (_, i) => ({ uuid: `a${i}` })) },
    { status: 200, body: [{ uuid: "b" }] },
  ], conn);
  const all = await new GustoClient(ctx).requestAll("/v1/companies/co-1/employees");
  assertEquals(all.length, 101);
  assertEquals(new URL(calls[1].url).searchParams.get("page"), "2");
});

Deno.test("client: the page size is capped at Gusto's maximum of 100", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [] }], conn);
  await new GustoClient(ctx).requestAll("/v1/companies/co-1/employees", {}, 5000);
  assertEquals(new URL(calls[0].url).searchParams.get("per"), "100");
});

/** The stale-version case is the one a workflow can fix by itself. */
Deno.test("describeError: a stale version is named, with the fix", () => {
  const message = describeError(
    422,
    JSON.stringify({ errors: { version: ["does not match the current version"] } }),
  );
  assert(/re-read the record and retry/.test(message), message);
});

Deno.test("describeError: a 401 points at the two-hour token life", () => {
  assert(/2 hours|two hours/i.test(describeError(401, "")), describeError(401, ""));
});

Deno.test("describeError: a 422 field tree is surfaced rather than the status", () => {
  const message = describeError(422, JSON.stringify({ errors: { email: ["is invalid"] } }));
  assert(message.includes("email"), message);
});

Deno.test("client: an error carries the status, the path and the detail", async () => {
  const { ctx } = mockCtx([{ status: 404, body: { message: "Not Found" } }], conn);
  const err = await assertRejects(
    async () => await new GustoClient(ctx).request("/v1/employees/nope"),
  );
  assert(String(err).includes("404"), String(err));
  assert(String(err).includes("/v1/employees/nope"), String(err));
});

Deno.test("companyIdFrom: an explicit id wins, the connection's is the default", () => {
  const { ctx } = mockCtx([], conn);
  assertEquals(companyIdFrom(ctx, "other"), "other");
  assertEquals(companyIdFrom(ctx, ""), "co-1");
});

Deno.test("companyIdFrom: with neither, the message says where to look", () => {
  const { ctx } = mockCtx([], { display: { environment: "demo" } });
  assertThrows(() => companyIdFrom(ctx), Error, "token-info");
});

Deno.test("csv / compact behave as the actions assume", () => {
  assertEquals(csv("a, b ,,c"), ["a", "b", "c"]);
  assertEquals(compact({ a: 1, b: "", c: null, d: [], e: "x" }), { a: 1, e: "x" });
});

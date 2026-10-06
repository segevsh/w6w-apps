import { assertEquals, assertThrows } from "@std/assert";
import {
  AcceloClient,
  apiBase,
  compact,
  deploymentFromConnection,
  describeFailure,
  listQuery,
  normalizeDeployment,
  oauthBase,
} from "../../lib/client.ts";
import { mockAcceloCtx, mockCtx } from "../_helpers.ts";

Deno.test("normalizeDeployment: accepts a bare label, a host, or a URL", () => {
  assertEquals(normalizeDeployment("Acme"), "acme");
  assertEquals(normalizeDeployment("acme.api.accelo.com"), "acme");
  assertEquals(normalizeDeployment("https://acme.api.accelo.com/api/v0"), "acme");
  assertEquals(normalizeDeployment("  planet-express "), "planet-express");
});

Deno.test("normalizeDeployment: refuses anything that could point the host elsewhere", () => {
  for (const bad of ["", "a.b", "evil.com/x", "acme.attacker.io", "-acme", "ac me", "a@b"]) {
    assertThrows(() => normalizeDeployment(bad), Error, "subdomain", bad);
  }
});

Deno.test("bases: API and OAuth hang off the deployment host", () => {
  assertEquals(apiBase("acme"), "https://acme.api.accelo.com/api/v0");
  assertEquals(oauthBase("acme"), "https://acme.api.accelo.com/oauth2/v0");
});

Deno.test("deploymentFromConnection: reads display, throws when absent", () => {
  assertEquals(deploymentFromConnection({ display: { deployment: "x" } } as never), "x");
  assertThrows(() => deploymentFromConnection(undefined), Error, "reconnect");
});

Deno.test("compact: drops undefined, null and blank but keeps 0 and false", () => {
  assertEquals(compact({ a: 1, b: undefined, c: null, d: "", e: 0, f: false }), {
    a: 1,
    e: 0,
    f: false,
  });
});

Deno.test("listQuery: defaults, and ordering is appended to the filters", () => {
  assertEquals(listQuery({}), {
    _page: 0,
    _limit: 50,
    _search: undefined,
    _fields: undefined,
    _filters: undefined,
  });
  assertEquals(
    listQuery({ filters: "id(1)", orderBy: "name" })._filters,
    "id(1),order_by_asc(name)",
  );
  assertEquals(
    listQuery({ orderBy: "name", orderDirection: "desc" })._filters,
    "order_by_desc(name)",
  );
});

Deno.test("client: never sets Authorization (the runtime signs)", async () => {
  const { ctx, calls } = mockAcceloCtx([{ body: { meta: { status: "ok" }, response: {} } }]);
  await new AcceloClient(ctx).request("/staff");
  assertEquals("authorization" in calls[0].headers, false);
  assertEquals(calls[0].headers.accept, "application/json");
});

Deno.test("client: refuses to run without a recorded deployment", () => {
  const { ctx } = mockCtx([]);
  assertThrows(() => new AcceloClient(ctx), Error, "no deployment");
});

Deno.test("client: a 200 whose meta.status is not ok is still a failure", async () => {
  const { ctx } = mockAcceloCtx([{ body: { meta: { status: "duplicate", message: "dup" } } }]);
  let msg = "";
  try {
    await new AcceloClient(ctx).request("/companies", { method: "POST", form: { name: "x" } });
  } catch (e) {
    msg = (e as Error).message;
  }
  assertEquals(msg, "Accelo 200 duplicate for POST /api/v0/companies: dup");
});

Deno.test("client: a non-JSON failure body is quoted, truncated", async () => {
  const { ctx } = mockAcceloCtx([{ status: 502, body: "<html>bad gateway</html>" }]);
  let msg = "";
  try {
    await new AcceloClient(ctx).request("/staff");
  } catch (e) {
    msg = (e as Error).message;
  }
  assertEquals(msg, "Accelo 502 for GET /api/v0/staff: <html>bad gateway</html>");
});

Deno.test("client: json bodies are sent as application/json", async () => {
  const { ctx, calls } = mockAcceloCtx([{ body: { meta: { status: "ok" }, response: {} } }]);
  await new AcceloClient(ctx).request("/activities", { method: "POST", json: { subject: "s" } });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].body, '{"subject":"s"}');
});

Deno.test("list: a null response is an empty page", async () => {
  const { ctx } = mockAcceloCtx([{ body: { meta: { status: "ok" }, response: null } }]);
  const out = await new AcceloClient(ctx).list("/companies", { limit: 10 });
  assertEquals(out, { items: [], page: 0, limit: 10, hasMore: false });
});

Deno.test("describeFailure: falls back to the raw body when there is no envelope", () => {
  assertEquals(
    describeFailure(500, "GET", "/x", undefined, ""),
    "Accelo 500 for GET /x: no response body",
  );
});

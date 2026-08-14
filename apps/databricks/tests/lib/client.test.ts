import { assert, assertEquals, assertThrows } from "@std/assert";
import { DatabricksClient, workspaceUrlFromConnection } from "../../lib/client.ts";
import { mockCtx, mockDatabricksCtx, WORKSPACE_URL } from "../_helpers.ts";

/**
 * Every workspace has its own host, so the base URL is Connection state rather
 * than an Action param — recorded by `afterConnect`, read back from the redacted
 * `display`, and never taken from the credential.
 */
Deno.test("workspaceUrlFromConnection: reads the host published by afterConnect", () => {
  assertEquals(
    workspaceUrlFromConnection({ display: { workspaceUrl: WORKSPACE_URL } } as never),
    WORKSPACE_URL,
  );
});

/**
 * Without a host there is no URL to build, so this has to fail with an
 * instruction rather than produce a request against a relative path.
 */
Deno.test("workspaceUrlFromConnection: a connection with no host says to reconnect", () => {
  assertThrows(() => workspaceUrlFromConnection(undefined), Error, "reconnect");
  assertThrows(() => workspaceUrlFromConnection({} as never), Error, "no workspaceUrl");
  assertThrows(
    () => workspaceUrlFromConnection({ display: {} } as never),
    Error,
    "no workspaceUrl",
  );
});

Deno.test("client: builds every URL under the connection's workspace host", async () => {
  const { ctx, calls } = mockDatabricksCtx([{ body: { catalogs: [] } }]);
  await new DatabricksClient(ctx).request("/api/2.1/unity-catalog/catalogs");
  assertEquals(calls[0].url, `${WORKSPACE_URL}/api/2.1/unity-catalog/catalogs`);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].headers["accept"], "application/json");
});

/** A trailing slash would produce `//api/...`, which some gateways 404. */
Deno.test("client: strips a trailing slash from the recorded host", async () => {
  const { ctx, calls } = mockDatabricksCtx([{ body: {} }], {
    workspaceUrl: `${WORKSPACE_URL}///`,
  });
  await new DatabricksClient(ctx).request("/api/2.0/sql/statements/1");
  assertEquals(calls[0].url, `${WORKSPACE_URL}/api/2.0/sql/statements/1`);
});

Deno.test("client: drops unset query params and sends no body on a GET", async () => {
  const { ctx, calls } = mockDatabricksCtx([{ body: { tables: [] } }]);
  await new DatabricksClient(ctx).request("/api/2.1/unity-catalog/tables", {
    query: { catalog_name: "main", schema_name: undefined, x: "", y: null, max_results: 0 },
  });
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("catalog_name"), "main");
  // `0` is a real value and must survive the empty-string filter.
  assertEquals(url.searchParams.get("max_results"), "0");
  assertEquals(url.searchParams.has("schema_name"), false);
  assertEquals(url.searchParams.has("x"), false);
  assertEquals(url.searchParams.has("y"), false);
  assertEquals(calls[0].body, null);
  assertEquals(calls[0].headers["content-type"], undefined);
});

Deno.test("client: a body is sent as JSON with the matching content-type", async () => {
  const { ctx, calls } = mockDatabricksCtx([{ body: { name: "main" } }]);
  const result = await new DatabricksClient(ctx).request<{ name: string }>(
    "/api/2.1/unity-catalog/catalogs",
    { method: "POST", body: { name: "main" } },
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), { name: "main" });
  assertEquals(result, { name: "main" });
});

/** A delete answers 204 with nothing to parse — a success, not a parse error. */
Deno.test("client: 204 and an empty body both resolve to undefined", async () => {
  const { ctx } = mockDatabricksCtx([{ status: 204 }, { body: "" }]);
  const client = new DatabricksClient(ctx);
  assertEquals(
    await client.request("/api/2.1/unity-catalog/catalogs/main", { method: "DELETE" }),
    undefined,
  );
  assertEquals(await client.request("/api/2.1/unity-catalog/catalogs"), undefined);
});

/** The vendor's body is the useful half of a failure — it must reach the caller. */
Deno.test("client: a non-2xx throws with status, method, path and body", async () => {
  const { ctx } = mockDatabricksCtx([{
    status: 403,
    statusText: "Forbidden",
    body: '{"error_code":"PERMISSION_DENIED","message":"no access to catalog"}',
  }]);
  const err = await new DatabricksClient(ctx)
    .request("/api/2.1/unity-catalog/catalogs/main")
    .catch((e) => e as Error);

  assert(err instanceof Error);
  assert(err.message.includes("Databricks 403"), err.message);
  assert(err.message.includes("GET /api/2.1/unity-catalog/catalogs/main"), err.message);
  assert(err.message.includes("PERMISSION_DENIED"), err.message);
});

/** Credentials belong to `sign`; the client must never add an Authorization header. */
Deno.test("client: sends no Authorization header of its own", async () => {
  const { ctx, calls } = mockDatabricksCtx([{ body: {} }]);
  await new DatabricksClient(ctx).request("/api/2.1/unity-catalog/catalogs");
  assertEquals(calls[0].headers["authorization"], undefined);
});

/** Constructing against a connection with no host must fail before any request. */
Deno.test("client: refuses to construct without a workspace host", () => {
  const { ctx, calls } = mockCtx([]);
  assertThrows(() => new DatabricksClient(ctx), Error, "reconnect");
  assertEquals(calls.length, 0);
});

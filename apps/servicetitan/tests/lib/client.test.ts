import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import {
  compact,
  connectionTarget,
  csv,
  errorMessage,
  idList,
  normalizeTenantId,
  ServiceTitanClient,
} from "../../lib/client.ts";

Deno.test("errorMessage: folds ProblemDetails title, detail and field errors", () => {
  assertEquals(
    errorMessage(
      JSON.stringify({ title: "Bad", detail: "d", errors: { name: ["required", "x"] } }),
    ),
    "Bad; d; name: required, x",
  );
  assertEquals(errorMessage(JSON.stringify({ error: "invalid_client" })), "invalid_client");
  assertEquals(errorMessage("plain text"), "plain text");
  assertEquals(errorMessage(""), "");
});

Deno.test("tenant id: digits only", () => {
  assertEquals(normalizeTenantId(" 123 "), "123");
  assertThrows(() => normalizeTenantId("12/../3"), Error, "numeric");
  assertThrows(() => normalizeTenantId(""), Error, "numeric");
});

Deno.test("connectionTarget: environment picks the host, defaulting to production", () => {
  const mk = (display: Record<string, unknown>) => mockCtx([], { display }).ctx.connection;
  assertEquals(connectionTarget(mk({ tenantId: "1" })).api, "https://api.servicetitan.io");
  assertEquals(
    connectionTarget(mk({ tenantId: "1", environment: "integration" })).api,
    "https://api-integration.servicetitan.io",
  );
});

Deno.test("compact / csv / idList", () => {
  assertEquals(compact({ a: 1, b: "", c: undefined, d: [], e: {}, f: false }), { a: 1, f: false });
  assertEquals(csv(" a, b ,,"), ["a", "b"]);
  assertEquals(idList("1,2"), [1, 2]);
  assertEquals(idList(""), undefined);
  assertThrows(() => idList("1,x"), Error, "not a numeric id");
});

Deno.test("client: never sets Authorization or ST-App-Key itself — that is sign's job", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], { display: { tenantId: "42" } });
  await new ServiceTitanClient(ctx).request("crm", "/customers");
  assertEquals(Object.keys(calls[0].headers).sort(), ["accept"]);
});

Deno.test("client: a 500 with a non-JSON body still surfaces status and path", async () => {
  const { ctx } = mockCtx([{ status: 500, statusText: "Oops", body: "boom" }], {
    display: { tenantId: "42" },
  });
  await assertRejects(
    () => new ServiceTitanClient(ctx).request("crm", "/customers"),
    Error,
    "500 Oops for GET /crm/v2/tenant/42/customers: boom",
  );
});

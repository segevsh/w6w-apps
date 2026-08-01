import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { mockCtx, mockServiceNowCtx } from "../_helpers.ts";
import {
  apiUrl,
  baseUrl,
  compact,
  fieldsBody,
  instanceFromConnection,
  ServiceNowClient,
  tablePath,
  unset,
} from "../../lib/client.ts";

Deno.test("client: builds the URL from the connection's instance, not a param", async () => {
  const { ctx, calls } = mockServiceNowCtx([{ body: { result: {} } }], "acme");
  await new ServiceNowClient(ctx).request("/table/incident/1");
  assertEquals(calls[0].url, "https://acme.service-now.com/api/now/table/incident/1");
  assertEquals("authorization" in calls[0].headers, false);
});

Deno.test("client: fails loudly when the connection carries no instance", () => {
  const { ctx } = mockCtx();
  assertThrows(() => new ServiceNowClient(ctx), Error, "no instance");
});

Deno.test("client: surfaces ServiceNow's error body", async () => {
  const { ctx } = mockServiceNowCtx([{
    status: 400,
    statusText: "Bad Request",
    body: '{"error":{"message":"Invalid table name","detail":"..."},"status":"failure"}',
  }]);
  await assertRejects(
    () => new ServiceNowClient(ctx).request("/table/nope", { method: "POST", body: {} }),
    Error,
    "Invalid table name",
  );
});

Deno.test("client: returns undefined for a 204", async () => {
  const { ctx } = mockServiceNowCtx([{ status: 204 }]);
  assertEquals(
    await new ServiceNowClient(ctx).request("/table/incident/1", { method: "DELETE" }),
    undefined,
  );
});

Deno.test("instanceFromConnection: reads the display data afterConnect records", () => {
  assertEquals(instanceFromConnection({ display: { instance: "acme" } } as never), "acme");
  assertThrows(() => instanceFromConnection(undefined), Error, "no instance");
});

Deno.test("baseUrl/apiUrl: build the per-instance hosts", () => {
  assertEquals(baseUrl("acme"), "https://acme.service-now.com");
  assertEquals(apiUrl("acme"), "https://acme.service-now.com/api/now");
});

Deno.test("tablePath: builds /table/<table> and /table/<table>/<sysId>, encoded", () => {
  assertEquals(tablePath("incident"), "/table/incident");
  assertEquals(tablePath("incident", "abc"), "/table/incident/abc");
  assertEquals(tablePath("u_my table", "a/b"), "/table/u_my%20table/a%2Fb");
});

Deno.test("fieldsBody: accepts an object or a JSON string, rejects an array/scalar", () => {
  assertEquals(fieldsBody({ a: 1 }), { a: 1 });
  assertEquals(fieldsBody('{"a":1}'), { a: 1 });
  assertEquals(fieldsBody(""), {});
  assertEquals(fieldsBody(undefined), {});
  assertThrows(() => fieldsBody("[1,2]"), Error, "must be a JSON object");
});

Deno.test("compact/unset behave as the other apps' helpers do", () => {
  assertEquals(compact({ a: 0, b: undefined, c: null }), { a: 0 });
  assertEquals(unset(""), undefined);
  assertEquals(unset("x"), "x");
});

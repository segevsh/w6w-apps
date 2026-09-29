import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import {
  environmentHeaders,
  formatCreatorError,
  parseJsonObject,
  ZohoCreatorApiError,
  ZohoCreatorClient,
} from "../../lib/client.ts";
import { mockCreatorCtx, mockCtx } from "../_helpers.ts";

Deno.test("formatCreatorError: uses the vendor's code/description when present", () => {
  const err = formatCreatorError(
    401,
    "GET",
    "/creator/v2/meta/applications",
    JSON.stringify({
      code: 1030,
      description: "Authorization Failure. The access token is either invalid or has expired.",
    }),
  );
  assert(err instanceof ZohoCreatorApiError);
  assertEquals(err.code, 1030);
  assert(err.message.includes("1030"));
  assert(err.message.includes("Authorization Failure"));
});

Deno.test("formatCreatorError: falls back to the raw body when it is not the documented shape", () => {
  const err = formatCreatorError(500, "GET", "/x", "<html>upstream exploded</html>");
  assert(err.message.includes("500"));
  assert(err.message.includes("upstream exploded"));
  assertEquals(err.code, undefined);
});

Deno.test("environmentHeaders: empty when environment is unset", () => {
  assertEquals(environmentHeaders({}), {});
  assertEquals(environmentHeaders({ demoUserName: "demouser_1" }), {});
});

Deno.test("environmentHeaders: sends environment and optional demo_user_name", () => {
  assertEquals(environmentHeaders({ environment: "development" }), {
    environment: "development",
  });
  assertEquals(
    environmentHeaders({ environment: "development", demoUserName: "demouser_1" }),
    { environment: "development", demo_user_name: "demouser_1" },
  );
});

Deno.test("parseJsonObject: parses a JSON string and passes through an object", () => {
  assertEquals(parseJsonObject('{"a":1}', "data"), { a: 1 });
  assertEquals(parseJsonObject({ a: 1 }, "data"), { a: 1 });
});

Deno.test("parseJsonObject: rejects missing/empty/array input", () => {
  assertThrows(() => parseJsonObject(undefined, "data"), Error, "required");
  assertThrows(() => parseJsonObject([1, 2], "data"), Error, "JSON object");
});

Deno.test("ZohoCreatorClient#request: resolves the host from the connection and unwraps JSON", async () => {
  const { ctx, calls } = mockCreatorCtx([
    { body: { code: 3000, applications: [{ link_name: "zylker-store" }] } },
  ]);
  const out = await new ZohoCreatorClient(ctx).request<
    { applications: Array<Record<string, unknown>> }
  >("/meta/applications");
  const url = new URL(calls[0].url);
  assertEquals(url.host, "www.zohoapis.com");
  assertEquals(url.pathname, "/creator/v2/meta/applications");
  assertEquals(out.applications, [{ link_name: "zylker-store" }]);
});

Deno.test("ZohoCreatorClient#request: drops undefined/empty query params", async () => {
  const { ctx, calls } = mockCreatorCtx([{ body: { code: 3000, data: [] } }]);
  await new ZohoCreatorClient(ctx).request("/data/owner/app/report/R", {
    query: { from: undefined, limit: 100, criteria: "" },
  });
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("from"), null);
  assertEquals(url.searchParams.get("criteria"), null);
  assertEquals(url.searchParams.get("limit"), "100");
});

Deno.test("ZohoCreatorClient#request: JSON-serializes a body and sets content-type", async () => {
  const { ctx, calls } = mockCreatorCtx([
    { body: { result: [{ code: 3000, data: { ID: "1" } }], code: 3000 } },
  ]);
  await new ZohoCreatorClient(ctx).request("/data/owner/app/form/F", {
    method: "POST",
    body: { data: { Email: "a@b.com" } },
  });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), { data: { Email: "a@b.com" } });
});

Deno.test("ZohoCreatorClient#request: sends extra headers, dropping unset ones", async () => {
  const { ctx, calls } = mockCreatorCtx([{ body: { code: 3000, data: [] } }]);
  await new ZohoCreatorClient(ctx).request("/data/owner/app/report/R", {
    headers: { environment: "development", demo_user_name: undefined },
  });
  assertEquals(calls[0].headers["environment"], "development");
  assertEquals(calls[0].headers["demo_user_name"], undefined);
});

Deno.test("ZohoCreatorClient#request: throws ZohoCreatorApiError with the parsed code on failure", async () => {
  const { ctx } = mockCreatorCtx([
    { status: 401, body: { code: 1030, description: "Authorization Failure." } },
  ]);
  const err = await assertRejects(
    () => new ZohoCreatorClient(ctx).request("/meta/applications"),
    ZohoCreatorApiError,
  );
  assertEquals(err.code, 1030);
});

Deno.test("ZohoCreatorClient#request: sends a multipart form body as-is", async () => {
  const { ctx, calls } = mockCreatorCtx([
    { body: { code: 3000, filename: "a.png", filepath: "1_a.png", message: "ok" } },
  ]);
  const form = new FormData();
  form.append("file", new Blob(["hi"]), "a.png");
  await new ZohoCreatorClient(ctx).request("/data/owner/app/report/R/1/Field/upload", {
    method: "POST",
    form,
  });
  assertEquals(calls[0].body, "[FormData]");
  assertEquals(calls[0].headers["content-type"], undefined);
});

Deno.test("ZohoCreatorClient#requestRaw: returns text content as-is for a text content type", async () => {
  const { ctx, calls } = mockCreatorCtx([
    { status: 200, headers: { "content-type": "text/plain" }, body: "hello world" },
  ]);
  const out = await new ZohoCreatorClient(ctx).requestRaw(
    "/data/owner/app/report/R/1/Field/download",
  );
  assertEquals(out.base64, false);
  assertEquals(out.content, "hello world");
  assertEquals(out.contentType, "text/plain");
  assertEquals(calls[0].method, "GET");
});

Deno.test("ZohoCreatorClient#requestRaw: base64-encodes a binary content type", async () => {
  const { ctx } = mockCreatorCtx([
    { status: 200, headers: { "content-type": "image/png" }, body: "\x89PNG\r\n" },
  ]);
  const out = await new ZohoCreatorClient(ctx).requestRaw(
    "/data/owner/app/report/R/1/Field/download",
  );
  assertEquals(out.base64, true);
  assertEquals(out.contentType, "image/png");
  assert(out.content.length > 0);
});

Deno.test("ZohoCreatorClient#requestRaw: throws the formatted error on a non-ok response", async () => {
  const { ctx } = mockCreatorCtx([
    { status: 404, body: { code: 3190, description: 'No record with ID "1" found.' } },
  ]);
  await assertRejects(
    () => new ZohoCreatorClient(ctx).requestRaw("/data/owner/app/report/R/1/Field/download"),
    ZohoCreatorApiError,
  );
});

Deno.test("mockCtx: an unqueued fetch throws loudly rather than hanging", () => {
  const { ctx } = mockCtx([]);
  assertThrows(() => ctx.fetch("https://example.com/"));
});

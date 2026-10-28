import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import { mockBiginCtx, mockCtx } from "../_helpers.ts";
import {
  apiDomainFromConnection,
  apiDomainFromCredential,
  BiginClient,
  DEFAULT_API_DOMAIN,
  fields,
  moduleName,
  unwrapRecordResult,
} from "../../lib/client.ts";

Deno.test("apiDomainFromConnection: falls back to the US host when the connection has none", () => {
  assertEquals(apiDomainFromConnection(undefined), DEFAULT_API_DOMAIN);
  assertEquals(DEFAULT_API_DOMAIN, "https://www.zohoapis.com");
  assertEquals(
    apiDomainFromConnection(
      { id: "c", app: "a", auth: "oauth2", state: "connected", display: {} } as never,
    ),
    DEFAULT_API_DOMAIN,
  );
});

Deno.test("apiDomainFromConnection: reads the recorded regional host and trims trailing slashes", () => {
  const connection = {
    id: "c",
    app: "a",
    auth: "oauth2",
    state: "connected",
    display: { apiDomain: "https://www.zohoapis.eu/" },
  } as never;
  assertEquals(apiDomainFromConnection(connection), "https://www.zohoapis.eu");
});

Deno.test("apiDomainFromCredential: accepts apiDomain and api_domain, defaults to US", () => {
  assertEquals(
    apiDomainFromCredential({ apiDomain: "https://www.zohoapis.jp" }),
    "https://www.zohoapis.jp",
  );
  assertEquals(
    apiDomainFromCredential({ api_domain: "https://www.zohoapis.sa/" }),
    "https://www.zohoapis.sa",
  );
  assertEquals(apiDomainFromCredential({}), DEFAULT_API_DOMAIN);
});

Deno.test("moduleName: accepts a plain identifier, rejects a path-escaping value", () => {
  assertEquals(moduleName("Contacts"), "Contacts");
  assertEquals(moduleName("Accounts"), "Accounts");
  assertThrows(() => moduleName("../users"), Error, "not a valid Bigin module API name");
  assertThrows(() => moduleName("Contacts/search"), Error, "not a valid Bigin module API name");
});

Deno.test("fields: requires an object and rejects blanks", () => {
  assertEquals(fields({ Last_Name: "Smith" }), { Last_Name: "Smith" });
  assertEquals(fields('{"Last_Name":"Smith"}'), { Last_Name: "Smith" });
  assertThrows(() => fields(undefined), Error, "required");
  assertThrows(() => fields([1, 2]), Error, "must be a JSON object");
});

Deno.test("unwrapRecordResult: returns the single entry on success", () => {
  const entry = unwrapRecordResult({
    data: [{ code: "SUCCESS", status: "success", message: "record added" }],
  });
  assertEquals(entry.code, "SUCCESS");
});

Deno.test("unwrapRecordResult: throws on a per-item error even with an otherwise-2xx response", () => {
  assertThrows(
    () =>
      unwrapRecordResult({
        data: [{ code: "MANDATORY_NOT_FOUND", status: "error", message: "Last_Name required" }],
      }),
    Error,
    "MANDATORY_NOT_FOUND: Last_Name required",
  );
});

Deno.test("unwrapRecordResult: throws when the response carries no entry", () => {
  assertThrows(() => unwrapRecordResult({}), Error, "no result entry");
});

Deno.test("BiginClient: builds the versioned URL against the connection's regional host", async () => {
  const { ctx, calls } = mockBiginCtx([{ body: { data: [] } }], "https://www.zohoapis.eu");
  await new BiginClient(ctx).request("/Contacts");
  assertEquals(calls[0].url, "https://www.zohoapis.eu/bigin/v2/Contacts");
});

Deno.test("BiginClient: surfaces code + message from a request-level error body", async () => {
  const { ctx } = mockBiginCtx([
    {
      status: 401,
      body: { code: "INVALID_TOKEN", message: "invalid oauth token", status: "error" },
    },
  ]);
  await assertRejects(
    () => new BiginClient(ctx).request("/Contacts"),
    Error,
    "INVALID_TOKEN invalid oauth token",
  );
});

Deno.test("BiginClient: keeps the raw body when the error is not JSON", async () => {
  const { ctx } = mockBiginCtx([{ status: 502, body: "<html>bad gateway</html>" }]);
  await assertRejects(
    () => new BiginClient(ctx).request("/Contacts"),
    Error,
    "bad gateway",
  );
});

Deno.test("BiginClient: never sets Authorization itself", async () => {
  const { ctx, calls } = mockBiginCtx([{ body: { data: [] } }]);
  await new BiginClient(ctx).request("/Contacts");
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("BiginClient: omits empty query parameters instead of sending blanks", async () => {
  const { ctx, calls } = mockBiginCtx([{ body: { data: [] } }]);
  await new BiginClient(ctx).request("/Contacts", { query: { fields: "id", cvid: "" } });
  assertEquals(new URL(calls[0].url).search, "?fields=id");
});

Deno.test("mockCtx sanity: fetch is required for the sandbox contract", () => {
  const { ctx } = mockCtx();
  assertEquals(typeof ctx.fetch, "function");
  assert(typeof ctx.log === "function");
});

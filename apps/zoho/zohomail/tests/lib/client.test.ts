import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import {
  accountIdFrom,
  apiHostFromConnection,
  compact,
  DEFAULT_API_HOST,
  formatZohoMailError,
  toIdArray,
  ZohoMailClient,
} from "../../lib/client.ts";
import { envelope, errorBody, mockCtx, pathOf, statusOnly, usConnection } from "../_helpers.ts";

Deno.test("apiHostFromConnection: reads display.apiHost", () => {
  assertEquals(
    apiHostFromConnection(usConnection({ apiHost: "mail.zoho.eu" }) as never),
    "mail.zoho.eu",
  );
});

Deno.test("apiHostFromConnection: falls back to the US host with no connection", () => {
  assertEquals(apiHostFromConnection(undefined), DEFAULT_API_HOST);
  assertEquals(DEFAULT_API_HOST, "mail.zoho.com");
});

Deno.test("accountIdFrom: prefers the explicit input over the connection default", () => {
  const { ctx } = mockCtx([], usConnection({ accountId: "from-connection" }));
  assertEquals(accountIdFrom({ accountId: "from-input" }, ctx), "from-input");
});

Deno.test("accountIdFrom: falls back to the connection's recorded accountId", () => {
  const { ctx } = mockCtx([], usConnection({ accountId: "from-connection" }));
  assertEquals(accountIdFrom({}, ctx), "from-connection");
});

Deno.test("accountIdFrom: throws a clear error with neither", () => {
  const { ctx } = mockCtx([]);
  assertThrows(() => accountIdFrom({}, ctx), Error, "No `accountId` was provided");
});

Deno.test("compact: drops undefined/null/empty-string but keeps false and 0", () => {
  assertEquals(
    compact({ a: undefined, b: null, c: "", d: false, e: 0, f: "x" }),
    { d: false, e: 0, f: "x" },
  );
});

Deno.test("toIdArray: accepts a real array, a comma-separated string, and empty input", () => {
  assertEquals(toIdArray(["1", "2"]), ["1", "2"]);
  assertEquals(toIdArray("1, 2 ,3"), ["1", "2", "3"]);
  assertEquals(toIdArray(""), undefined);
  assertEquals(toIdArray(undefined), undefined);
});

Deno.test("formatZohoMailError: uses errorCode and moreInfo when present", () => {
  const msg = formatZohoMailError(
    400,
    "GET",
    "/api/accounts",
    JSON.stringify(errorBody("INVALID_TICKET", "Invalid ticket")),
  );
  assert(msg.includes("INVALID_TICKET"));
  assert(msg.includes("Invalid ticket"));
});

Deno.test("formatZohoMailError: falls back to status.description with no moreInfo", () => {
  const msg = formatZohoMailError(
    401,
    "GET",
    "/api/accounts",
    JSON.stringify(errorBody("INVALID_OAUTHTOKEN")),
  );
  assert(msg.includes("INVALID_OAUTHTOKEN"));
});

Deno.test("formatZohoMailError: falls back to the raw body when it is not the documented shape", () => {
  const msg = formatZohoMailError(500, "GET", "/api/accounts", "upstream exploded");
  assert(msg.includes("upstream exploded"));
});

Deno.test("ZohoMailClient: addresses the host recorded on the connection", async () => {
  const { ctx, calls } = mockCtx(
    [{ body: envelope([]) }],
    usConnection({ apiHost: "mail.zoho.eu" }),
  );
  await new ZohoMailClient(ctx).request("/accounts");
  assertEquals(new URL(calls[0].url).host, "mail.zoho.eu");
  assertEquals(pathOf(calls[0].url), "/api/accounts");
});

Deno.test("ZohoMailClient: returns undefined when the envelope carries no data", async () => {
  const { ctx } = mockCtx([{ body: statusOnly() }], usConnection());
  const result = await new ZohoMailClient(ctx).request("/accounts/1/updatemessage", {
    method: "PUT",
    body: { mode: "markAsRead", messageId: ["1"] },
  });
  assertEquals(result, undefined);
});

Deno.test("ZohoMailClient: never sets Authorization — that is the sign hook's job", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope([]) }], usConnection());
  await new ZohoMailClient(ctx).request("/accounts");
  assertEquals(calls[0].headers.authorization, undefined);
});

Deno.test("ZohoMailClient: throws a formatted error on a non-ok response", async () => {
  const { ctx } = mockCtx(
    [{ status: 400, body: errorBody("INVALID_TICKET", "Invalid ticket") }],
    usConnection(),
  );
  await assertRejects(
    () => new ZohoMailClient(ctx).request("/accounts"),
    Error,
    "INVALID_TICKET",
  );
});

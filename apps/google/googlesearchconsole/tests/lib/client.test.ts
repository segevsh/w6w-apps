import { test } from "node:test";
import { assertEquals, assertRejects, assertThrows } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import {
  compact,
  csv,
  json,
  requireSiteUrl,
  resolveSiteUrl,
  SearchConsoleClient,
} from "../../lib/client.ts";

test("requireSiteUrl: trims and requires non-empty", () => {
  assertEquals(requireSiteUrl("  https://a.com/  "), "https://a.com/");
  assertThrows(() => requireSiteUrl(""), Error, "`siteUrl` is required");
  assertThrows(() => requireSiteUrl(undefined), Error, "is required");
});

test("resolveSiteUrl: override wins over the connection default", () => {
  const connection = { display: { siteUrl: "https://default.com/" } } as never;
  assertEquals(resolveSiteUrl(connection, "https://override.com/"), "https://override.com/");
});

test("resolveSiteUrl: falls back to the connection, then throws with neither", () => {
  const connection = { display: { siteUrl: "https://default.com/" } } as never;
  assertEquals(resolveSiteUrl(connection, undefined), "https://default.com/");
  assertThrows(() => resolveSiteUrl(undefined, undefined), Error, "no Search Console site");
});

test("compact: drops undefined, null, empty string and empty arrays only", () => {
  assertEquals(
    compact({ a: 1, b: undefined, c: null, d: "", e: [], f: 0, g: false, h: ["x"] }),
    { a: 1, f: 0, g: false, h: ["x"] },
  );
});

test("csv: splits and trims a comma list; array input passes through trimmed", () => {
  assertEquals(csv("date, query ,page"), ["date", "query", "page"]);
  assertEquals(csv([" a ", "b"]), ["a", "b"]);
  assertEquals(csv(""), undefined);
  assertEquals(csv(undefined), undefined);
});

test("json: parses a JSON string, passes through a live value, rejects invalid JSON", () => {
  assertEquals(json('{"a":1}', "f"), { a: 1 });
  assertEquals(json({ a: 1 }, "f"), { a: 1 });
  assertEquals(json("", "f"), undefined);
  assertEquals(json(undefined, "f"), undefined);
  assertThrows(() => json("{not json", "f"), Error, "not valid JSON");
});

test("SearchConsoleClient: GET sends no body and Authorization is never set here", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { ok: true } }]);
  const out = await new SearchConsoleClient(ctx).request<{ ok: boolean }>("webmasters/v3/sites");
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(out, { ok: true });
});

test("SearchConsoleClient: a non-ok response throws with status and body detail", async () => {
  const { ctx } = mockCtx([{
    status: 403,
    body: { error: { code: 403, status: "PERMISSION_DENIED", message: "not verified" } },
  }]);
  await assertRejects(
    async () => await new SearchConsoleClient(ctx).request("webmasters/v3/sites"),
    Error,
    "403",
  );
});

test("SearchConsoleClient: a 204 and an empty body both resolve to undefined", async () => {
  const noContent = mockCtx([{ status: 204 }]);
  assertEquals(
    await new SearchConsoleClient(noContent.ctx).request("webmasters/v3/sites"),
    undefined,
  );

  const emptyBody = mockCtx([{ status: 200, body: "" }]);
  assertEquals(
    await new SearchConsoleClient(emptyBody.ctx).request("webmasters/v3/sites"),
    undefined,
  );
});

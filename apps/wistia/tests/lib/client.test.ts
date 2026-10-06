import { assert, assertEquals } from "@std/assert";
import {
  compact,
  encodeId,
  formatWistiaError,
  pageOf,
  toList,
  WistiaClient,
} from "../../lib/client.ts";
import { listQuery } from "../../lib/params.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("client: a 204 or empty body resolves to undefined", async () => {
  const { ctx } = mockCtx([{ status: 204 }, { body: "" }]);
  const client = new WistiaClient(ctx);
  assertEquals(await client.json("/x", { method: "DELETE" }), undefined);
  assertEquals(await client.json("/y"), undefined);
});

Deno.test("client: sends the version header and never an authorization header", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new WistiaClient(ctx).json("/account");
  assertEquals(calls[0].url, "https://api.wistia.com/modern/account");
  assertEquals(calls[0].headers["x-wistia-api-version"], "2026-09");
  assertEquals(calls[0].headers.authorization, undefined);
});

Deno.test("client: formats the 401 {code,error} and 400 {error,errors} shapes", () => {
  assertEquals(
    formatWistiaError(
      401,
      "GET",
      "/modern/account",
      '{"code":"unauthorized_credentials","error":"Invalid credentials."}',
    ),
    "Wistia 401 unauthorized_credentials for GET /modern/account: Invalid credentials.",
  );
  assertEquals(
    formatWistiaError(
      400,
      "PUT",
      "/modern/medias/a",
      '{"error":"Bad","errors":["name blank","tags bad"]}',
    ),
    "Wistia 400 for PUT /modern/medias/a: Bad: name blank; tags bad",
  );
});

Deno.test("client: a non-JSON error body is truncated, not dropped", () => {
  const msg = formatWistiaError(502, "GET", "/modern/x", "<html>" + "x".repeat(2000));
  assert(msg.startsWith("Wistia 502 for GET /modern/x: <html>"));
  assert(msg.includes("truncated"));
});

Deno.test("client: pageOf wraps a bare array and tolerates a non-array", () => {
  assertEquals(pageOf([{ cursor: "a" }, { cursor: "b" }]).nextCursor, "b");
  assertEquals(pageOf([{ id: 1 }]).nextCursor, null);
  assertEquals(pageOf(undefined), { items: [], count: 0, nextCursor: null });
});

Deno.test("client: helpers", () => {
  assertEquals(toList(" a, b ,,c"), ["a", "b", "c"]);
  assertEquals(toList(""), undefined);
  assertEquals(toList([]), undefined);
  assertEquals(compact({ a: 1, b: "", c: undefined, d: false }), { a: 1, d: false });
  assertEquals(encodeId(" a/b "), "a%2Fb");
  assertEquals(listQuery({ sortDirection: 0 }).sort_direction, "0");
});

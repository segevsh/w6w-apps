import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import {
  authIdFromCtx,
  defined,
  joinDestinations,
  PlivoClient,
  segment,
} from "../../lib/client.ts";
import { CONN, mockCtx } from "../_helpers.ts";

Deno.test("client: url puts the Auth ID in the path with the trailing slash intact", () => {
  const c = new PlivoClient(mockCtx([], CONN).ctx);
  assertEquals(c.url("Message/"), "https://api.plivo.com/v1/Account/MA_TEST/Message/");
});

Deno.test("client: authIdFromCtx requires a non-empty display Auth ID", () => {
  assertEquals(authIdFromCtx(mockCtx([], CONN).ctx), "MA_TEST");
  assertThrows(() => authIdFromCtx(mockCtx([]).ctx), Error, "Auth ID missing");
  assertThrows(
    () => authIdFromCtx(mockCtx([], { connection: { display: { authId: "" } } }).ctx),
    Error,
    "Auth ID missing",
  );
});

Deno.test("client: defined drops undefined, null and empty strings but keeps 0 and false", () => {
  assertEquals(defined({ a: 1, b: undefined, c: null, d: "", e: 0, f: false }), {
    a: 1,
    e: 0,
    f: false,
  });
});

Deno.test("client: segment encodes, trims and refuses blanks", () => {
  assertEquals(segment("x", " a/b "), "a%2Fb");
  assertEquals(segment("x", 12), "12");
  assertThrows(() => segment("x", "  "), Error, "`x` is required");
  assertThrows(() => segment("x", undefined), Error, "required");
});

Deno.test("client: joinDestinations", () => {
  assertEquals(joinDestinations("1"), "1");
  assertEquals(joinDestinations(["1", "2"]), "1<2");
  assertEquals(joinDestinations([]), undefined);
  assertEquals(joinDestinations(undefined), undefined);
});

Deno.test("client: 204/empty bodies resolve undefined; invalid JSON on success is an error", async () => {
  const ok = mockCtx([{ status: 204 }], CONN);
  assertEquals(await new PlivoClient(ok.ctx).request("Call/x/", { method: "DELETE" }), undefined);
  const bad = mockCtx([{ status: 200, body: "<html>" }], CONN);
  await assertRejects(
    async () => await new PlivoClient(bad.ctx).request("Call/"),
    Error,
    "not JSON",
  );
});

Deno.test("client: errors carry method, path and the raw body", async () => {
  const { ctx } = mockCtx([{ status: 429, statusText: "Too Many", body: "slow down" }], CONN);
  await assertRejects(
    async () => await new PlivoClient(ctx).request("Message/", { method: "POST", json: { a: 1 } }),
    Error,
    "Plivo 429 Too Many for POST /v1/Account/MA_TEST/Message/: slow down",
  );
});

import { assertEquals } from "@std/assert";
import api from "../../health/api.ts";
import { mockCtx } from "../_helpers.ts";

const UNAUTH = { statusCode: 401, error: { code: "UNAUTHORIZED", details: [], message: "x" } };

Deno.test("api: an unsigned probe that gets the vendor's UNAUTHORIZED refusal is ok", async () => {
  const { ctx, calls } = mockCtx([{ status: 401, body: UNAUTH }]);
  assertEquals((await api.check!({}, ctx)).state, "ok");
  assertEquals(calls[0].url, "https://api.linkup.so/v1/credits/balance");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(api.credential, "none");
});

Deno.test("api: 5xx is down; a foreign 401 or a 200 is unknown", async () => {
  assertEquals(
    (await api.check!({}, mockCtx([{ status: 502, body: "bad gateway" }]).ctx)).state,
    "down",
  );
  assertEquals(
    (await api.check!({}, mockCtx([{ status: 401, body: "<html>" }]).ctx)).state,
    "unknown",
  );
  assertEquals((await api.check!({}, mockCtx([{ body: { balance: 1 } }]).ctx)).state, "unknown");
});

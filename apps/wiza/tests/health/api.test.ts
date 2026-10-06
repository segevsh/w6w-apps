import { assertEquals } from "@std/assert";
import api from "../../health/api.ts";
import { mockCtx } from "../_helpers.ts";

const invalid = { status: { code: 401, message: "Invalid API key." } };

Deno.test("api: unsigned, app-scoped, degraded severity", () => {
  assertEquals(api.credential, "none");
  assertEquals(api.severity, "degraded");
});

Deno.test("api: the documented 401 envelope is a pass and sends no credential", async () => {
  const { ctx, calls } = mockCtx([{ status: 401, body: invalid }]);
  assertEquals((await api.check!({} as never, ctx)).state, "ok");
  assertEquals(calls[0].url, "https://wiza.co/api/meta/credits");
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("api: 5xx and a network error are down; 429 and an unexpected body are degraded", async () => {
  assertEquals(
    (await api.check!({} as never, mockCtx([{ status: 503, body: "x" }]).ctx)).state,
    "down",
  );
  const ctx = { fetch: () => Promise.reject(new Error("dns")), log: () => {} };
  assertEquals((await api.check!({} as never, ctx as never)).state, "down");
  assertEquals(
    (await api.check!({} as never, mockCtx([{ status: 429, body: "x" }]).ctx)).state,
    "degraded",
  );
  assertEquals(
    (await api.check!({} as never, mockCtx([{ body: "<html>challenge</html>" }]).ctx)).state,
    "degraded",
  );
});

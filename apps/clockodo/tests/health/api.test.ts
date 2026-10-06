import { assertEquals } from "@std/assert";
import api from "../../health/api.ts";
import { mockCtx } from "../_helpers.ts";

const refused = {
  errors: [{ type: "General", message: "Authentication failed", details: null, path: null }],
};

Deno.test("api: unsigned, app-scoped, degraded severity", () => {
  assertEquals(api.credential, "none");
  assertEquals(api.scope, "app");
  assertEquals(api.severity, "degraded");
});

Deno.test("api: the documented 401 envelope is a pass and sends no credential", async () => {
  const { ctx, calls } = mockCtx([{ status: 401, body: refused }]);
  assertEquals((await api.check!({} as never, ctx)).state, "ok");
  assertEquals(calls[0].url, "https://my.clockodo.com/api/v4/users/me");
  assertEquals(calls[0].headers["x-clockodoapikey"], undefined);
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
  // A 401 that is not Clockodo's envelope (an edge page) is not proof the API is serving.
  assertEquals(
    (await api.check!({} as never, mockCtx([{ status: 401, body: "<html>denied</html>" }]).ctx))
      .state,
    "degraded",
  );
});

import { assert, assertEquals } from "@std/assert";
import api from "../../health/api.ts";
import { mockCtx } from "../_helpers.ts";

const authErr = { status: 401, error: { type: ["authentication_error"], message: "missing" } };

Deno.test("api: declares an unsigned dependency check", () => {
  assertEquals(api.kind, "dependency");
  assertEquals(api.credential, "none");
});

Deno.test("api: PDL's 401 authentication_error envelope proves reachability", async () => {
  const { ctx, calls } = mockCtx([{ status: 401, body: authErr }]);
  const r = await api.check!({} as never, ctx);
  assertEquals(r.state, "ok");
  assertEquals(new URL(calls[0].url).pathname, "/v5/autocomplete");
  assertEquals(calls[0].headers["x-api-key"], undefined);
});

Deno.test("api: a bare 401, a 200, a 5xx and a network error are not healthy", async () => {
  assertEquals(
    (await api.check!({} as never, mockCtx([{ status: 401, body: "<html/>" }]).ctx)).state,
    "degraded",
  );
  assertEquals(
    (await api.check!({} as never, mockCtx([{ status: 200, body: { data: [] } }]).ctx)).state,
    "degraded",
  );
  assertEquals(
    (await api.check!({} as never, mockCtx([{ status: 503, body: "x" }]).ctx)).state,
    "down",
  );
  const down = await api.check!({} as never, mockCtx([]).ctx);
  assertEquals(down.state, "down");
  assert(down.message!.includes("could not reach"));
});

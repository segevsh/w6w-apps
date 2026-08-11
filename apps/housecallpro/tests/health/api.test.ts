import { assert, assertEquals } from "@std/assert";
import api, { EXPECTED_401_MESSAGE, PROBE_URL } from "../../health/api.ts";
import { mockCtx, unauthorizedBody } from "../_helpers.ts";

Deno.test("api: probes the app's own host unsigned, widening nothing", () => {
  assertEquals(PROBE_URL, "https://api.housecallpro.com/company");
  assertEquals(api.credential, "none");
  assertEquals(api.kind, "dependency");
  // api.housecallpro.com is already the app's egress host; there is nothing to widen.
  assertEquals(api.network, undefined);
});

/**
 * The probe carries no credential, so Housecall Pro rejects it. That rejection —
 * in the vendor's own JSON error shape — is the evidence the API is answering.
 * Judging by the HTTP status would report Housecall Pro permanently down.
 */
Deno.test("api: a 401 with the vendor's JSON body is the pass", async () => {
  const { ctx, calls } = mockCtx([{ status: 401, body: unauthorizedBody() }]);
  const out = await api.check!({} as never, ctx);

  assertEquals(calls[0].url, PROBE_URL);
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(out.state, "ok");
  assert(out.message!.includes(EXPECTED_401_MESSAGE));
});

Deno.test("api: a 401 without a JSON body means something else answered", async () => {
  for (const body of ["<html>Access denied</html>", "", "[]"]) {
    const { ctx } = mockCtx([{ status: 401, body }]);
    const out = await api.check!({} as never, ctx);
    assertEquals(out.state, "down", `body: ${body}`);
  }
});

Deno.test("api: a 200 is degraded, not a pass — the endpoint requires a credential", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { id: "co1" } }]);
  const out = await api.check!({} as never, ctx);
  assertEquals(out.state, "degraded");
  assert(out.message!.includes("with no credential"));
});

Deno.test("api: a 404 or a 5xx is down", async () => {
  for (const status of [404, 500, 502]) {
    const { ctx } = mockCtx([{ status, body: { message: "nope" } }]);
    assertEquals((await api.check!({} as never, ctx)).state, "down", `status ${status}`);
  }
});

Deno.test("api: says in its own description that it judges no credential", () => {
  assert(api.description!.includes("says nothing about any credential"));
});

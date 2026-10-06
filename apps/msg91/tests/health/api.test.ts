import { assertEquals } from "@std/assert";
import api, { PROBE_URL } from "../../health/api.ts";
import { mockCtx } from "../_helpers.ts";

const run = (r: Parameters<typeof mockCtx>[0]) => api.check!({} as never, mockCtx(r).ctx);
const UNAUTH = {
  status: "fail",
  hasError: true,
  errors: "Unauthorized",
  code: "401",
  apiError: "201",
};

Deno.test("api health: unsigned dependency check", () => {
  assertEquals(api.credential, "none");
  assertEquals(api.kind, "dependency");
});

Deno.test("api health: probes the documented path with no credential", async () => {
  const { ctx, calls } = mockCtx([{ status: 401, body: UNAUTH }]);
  await api.check!({} as never, ctx);
  assertEquals(calls[0].url, PROBE_URL);
  assertEquals(calls[0].headers["authkey"], undefined);
});

Deno.test("api health: a schema-correct JSON 401 is ok, even served as text/html", async () => {
  assertEquals((await run([{ status: 401, body: UNAUTH }])).state, "ok");
  assertEquals(
    (await run([{ status: 401, body: UNAUTH, headers: { "content-type": "text/html" } }])).state,
    "ok",
  );
});

Deno.test("api health: 5xx is down; HTML, plain text or a Route Missing 404 is unknown", async () => {
  assertEquals((await run([{ status: 502, body: "bad gateway", headers: {} }])).state, "down");
  assertEquals(
    (await run([{ status: 200, body: "<html></html>", headers: { "content-type": "text/html" } }]))
      .state,
    "unknown",
  );
  assertEquals((await run([{ status: 401, body: "plain", headers: {} }])).state, "unknown");
  assertEquals(
    (await run([{ status: 404, body: { type: "error", msg: "Route Missing" } }])).state,
    "unknown",
  );
});

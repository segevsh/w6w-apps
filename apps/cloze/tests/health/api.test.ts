import { assertEquals } from "@std/assert";
import api, { PROBE_URL } from "../../health/api.ts";
import { mockCtx } from "../_helpers.ts";

const run = (r: Parameters<typeof mockCtx>[0]) => api.check!({} as never, mockCtx(r).ctx);

Deno.test("api health: unsigned dependency check", () => {
  assertEquals(api.credential, "none");
  assertEquals(api.kind, "dependency");
});

Deno.test("api health: probes the documented path with no credential", async () => {
  const { ctx, calls } = mockCtx([{ status: 401, body: { errorcode: 1, message: "x" } }]);
  await api.check!({} as never, ctx);
  assertEquals(calls[0].url, PROBE_URL);
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("api health: a schema-correct JSON 401 is ok", async () => {
  assertEquals(
    (await run([{ status: 401, body: { errorcode: 1, message: "The API key was not found" } }]))
      .state,
    "ok",
  );
  assertEquals((await run([{ status: 401, body: { message: "Invalid token" } }])).state, "ok");
});

Deno.test("api health: 5xx is down; HTML or an unknown body is unknown", async () => {
  assertEquals((await run([{ status: 502, body: "bad gateway", headers: {} }])).state, "down");
  assertEquals(
    (await run([{ status: 200, body: "<html></html>", headers: { "content-type": "text/html" } }]))
      .state,
    "unknown",
  );
  assertEquals((await run([{ status: 401, body: "plain", headers: {} }])).state, "unknown");
  assertEquals(
    (await run([{ status: 404, body: { errorcode: 404, message: "Resource Not Found" } }])).state,
    "unknown",
  );
});

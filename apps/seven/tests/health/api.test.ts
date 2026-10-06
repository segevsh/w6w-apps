import { assertEquals } from "@std/assert";
import api, { PROBE_URL } from "../../health/api.ts";
import { mockCtx } from "../_helpers.ts";

const run = (r: Parameters<typeof mockCtx>[0]) => api.check!({} as never, mockCtx(r).ctx);

Deno.test("api health: unsigned dependency check on GET /api/balance", async () => {
  assertEquals(api.credential, "none");
  assertEquals(api.kind, "dependency");
  const { ctx, calls } = mockCtx([{ body: '"900"' }]);
  await api.check!({} as never, ctx);
  assertEquals(calls[0].url, PROBE_URL);
  assertEquals(calls[0].headers["x-api-key"], undefined);
});

Deno.test("api health: the documented bare 900 is ok, in JSON or plain form", async () => {
  assertEquals((await run([{ body: '"900"' }])).state, "ok");
  assertEquals(
    (await run([{ body: "900", headers: { "content-type": "text/plain" } }])).state,
    "ok",
  );
});

Deno.test("api health: 5xx is down; an HTML shell, or a 200 with any other body, is unknown", async () => {
  assertEquals((await run([{ status: 503, body: "unavailable", headers: {} }])).state, "down");
  assertEquals(
    (await run([{ status: 200, body: "<html></html>", headers: { "content-type": "text/html" } }]))
      .state,
    "unknown",
  );
  assertEquals((await run([{ body: { hello: "world" } }])).state, "unknown");
  assertEquals((await run([{ body: '"500"' }])).state, "unknown");
});

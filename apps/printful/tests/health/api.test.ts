import { assertEquals } from "@std/assert";
import api from "../../health/api.ts";
import { mockCtx } from "../_helpers.ts";

const run = async (r: Parameters<typeof mockCtx>[0]) =>
  await api.check!({} as never, mockCtx(r).ctx);

Deno.test("api: the schema-correct 401 envelope is a pass", async () => {
  const out = await run([{
    status: 401,
    body: { code: 401, result: "x", error: { reason: "Unauthorized", message: "m" } },
  }]);
  assertEquals(out.state, "ok");
});

Deno.test("api: 5xx is down, an unrelated body is degraded, a network error is down", async () => {
  assertEquals((await run([{ status: 502, body: "bad" }])).state, "down");
  assertEquals((await run([{ status: 200, body: "<html>" }])).state, "degraded");
  assertEquals((await run([])).state, "down");
});

Deno.test("api: declared unsigned", () => {
  assertEquals(api.credential, "none");
  assertEquals(api.severity, "degraded");
});

import { assertEquals } from "@std/assert";
import api from "../../health/api.ts";
import { mockCtx, text } from "../_helpers.ts";

const run = async (status: number, body: string) => {
  const { ctx, calls } = mockCtx([text(body, status)]);
  return { report: await api.check!({}, ctx), calls };
};

Deno.test("api: unsigned dependency check on the API host", () => {
  assertEquals(api.credential, "none");
  assertEquals(api.kind, "dependency");
  assertEquals(api.scope, "app");
});

Deno.test("api: the 403 'AppId required' refusal is a pass, and the call carries no auth", async () => {
  const { report, calls } = await run(
    403,
    "AppId required! Contact app developer. See https://inoreader.dev",
  );
  assertEquals(report.state, "ok");
  assertEquals(calls[0].url, "https://www.inoreader.com/reader/api/0/user-info");
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("api: the 401 'OAuth token not found' refusal is a pass", async () => {
  assertEquals((await run(401, "OAuth token not found or invalid.")).report.state, "ok");
});

Deno.test("api: a 403 HTML challenge page is unknown, not a pass", async () => {
  const { report } = await run(403, "<!DOCTYPE html><html>Just a moment... AppId required</html>");
  assertEquals(report.state, "unknown");
});

Deno.test("api: 5xx is down; an unexpected unsigned 200 is unknown", async () => {
  assertEquals((await run(503, "")).report.state, "down");
  assertEquals((await run(200, "{}")).report.state, "unknown");
});

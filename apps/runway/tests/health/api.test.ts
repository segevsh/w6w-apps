import { assertEquals } from "@std/assert";
import api from "../../health/api.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("api: the schema-correct 401 error envelope is a pass, unsigned", async () => {
  const { ctx, calls } = mockCtx([{
    status: 401,
    body: { error: "No API key was provided.", docUrl: "https://docs.dev.runwayml.com/api" },
  }]);
  assertEquals(api.credential, "none");
  assertEquals((await api.check!({}, ctx)).state, "ok");
  assertEquals(calls[0].url, "https://api.dev.runwayml.com/v1/organization");
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(calls[0].headers["x-runway-version"], "2024-11-06");
});

Deno.test("api: 5xx is down; a 401 that is not Runway's envelope is unknown", async () => {
  const down = mockCtx([{ status: 502, body: "bad gateway" }]);
  assertEquals((await api.check!({}, down.ctx)).state, "down");
  const odd = mockCtx([{ status: 401, headers: { "content-type": "text/html" }, body: "<html>" }]);
  assertEquals((await api.check!({}, odd.ctx)).state, "unknown");
});

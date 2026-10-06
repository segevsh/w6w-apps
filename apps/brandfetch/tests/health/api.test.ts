import { assertEquals } from "@std/assert";
import api from "../../health/api.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("api: the schema-correct 401 Unauthorized is a pass, unsigned", async () => {
  const { ctx, calls } = mockCtx([{ status: 401, body: { message: "Unauthorized" } }]);
  assertEquals(api.credential, "none");
  assertEquals((await api.check!({}, ctx)).state, "ok");
  assertEquals(calls[0].url, "https://api.brandfetch.io/v2/viewer");
  assertEquals(calls[0].headers.authorization, undefined);
});

Deno.test("api: 5xx is down; an unrelated 401 body is unknown", async () => {
  const down = mockCtx([{ status: 502, body: "bad gateway" }]);
  assertEquals((await api.check!({}, down.ctx)).state, "down");
  const odd = mockCtx([{ status: 401, headers: { "content-type": "text/html" }, body: "<html>" }]);
  assertEquals((await api.check!({}, odd.ctx)).state, "unknown");
});

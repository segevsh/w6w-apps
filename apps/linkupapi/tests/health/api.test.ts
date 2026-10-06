import { assertEquals } from "@std/assert";
import api from "../../health/api.ts";
import { mockCtx } from "../_helpers.ts";

const input = {} as never;

Deno.test("api: the JSON INVALID_API_KEY refusal proves the API is serving", async () => {
  const { ctx, calls } = mockCtx([{
    status: 403,
    body: { success: false, error: { code: "INVALID_API_KEY" } },
  }]);
  const r = await api.check!(input, ctx);
  assertEquals(r.state, "ok");
  assertEquals(calls[0].url, "https://api.linkupapi.com/v2/credits");
  assertEquals(calls[0].headers["x-api-key"], undefined);
});

Deno.test("api: a 5xx is down", async () => {
  const { ctx } = mockCtx([{ status: 502, body: "bad gateway" }]);
  assertEquals((await api.check!(input, ctx)).state, "down");
});

Deno.test("api: a 200 HTML shell is unknown, not ok", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: "<html></html>",
    headers: { "content-type": "text/html" },
  }]);
  assertEquals((await api.check!(input, ctx)).state, "unknown");
});

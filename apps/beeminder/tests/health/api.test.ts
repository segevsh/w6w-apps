import { assertEquals } from "@std/assert";
import api from "../../health/api.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("api: the schema-correct 401 errors object is a pass, unsigned", async () => {
  const { ctx, calls } = mockCtx([{
    status: 401,
    body: { errors: { message: "Token missing or incorrect token.", token: "no_token" } },
  }]);
  assertEquals(api.credential, "none");
  assertEquals((await api.check!({}, ctx)).state, "ok");
  assertEquals(calls[0].url, "https://www.beeminder.com/api/v1/users/me.json");
  assertEquals(calls[0].url.includes("auth_token"), false);
});

Deno.test("api: 5xx is down; a 404 singular-error body or a foreign 401 is unknown", async () => {
  const down = mockCtx([{ status: 502, body: "bad gateway" }]);
  assertEquals((await api.check!({}, down.ctx)).state, "down");
  const notFound = mockCtx([{
    status: 404,
    body: { error: "The requested resource was not found." },
  }]);
  assertEquals((await api.check!({}, notFound.ctx)).state, "unknown");
  const odd = mockCtx([{ status: 401, headers: { "content-type": "text/html" }, body: "<html>" }]);
  assertEquals((await api.check!({}, odd.ctx)).state, "unknown");
});

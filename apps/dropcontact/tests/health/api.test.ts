import { assertEquals } from "@std/assert";
import api from "../../health/api.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("api: the schema-correct 401 refusal is a pass, unsigned", async () => {
  const { ctx, calls } = mockCtx([{
    status: 401,
    body: {
      error: true,
      reason: "No api key received. Please set 'X-Access-Token' header with your api key as value.",
      success: false,
    },
  }]);
  assertEquals(api.credential, "none");
  assertEquals((await api.check!({}, ctx)).state, "ok");
  assertEquals(calls[0].url, "https://api.dropcontact.com/v1/enrich/all");
  assertEquals(calls[0].headers["x-access-token"], undefined);
});

Deno.test("api: 5xx is down; an unrelated 401/403 body is unknown", async () => {
  assertEquals(
    (await api.check!({}, mockCtx([{ status: 502, body: "bad gateway" }]).ctx)).state,
    "down",
  );
  const gateway = mockCtx([{ status: 403, body: { message: "Missing Authentication Token" } }]);
  assertEquals((await api.check!({}, gateway.ctx)).state, "unknown");
  const odd = mockCtx([{ status: 401, headers: { "content-type": "text/html" }, body: "<html>" }]);
  assertEquals((await api.check!({}, odd.ctx)).state, "unknown");
});

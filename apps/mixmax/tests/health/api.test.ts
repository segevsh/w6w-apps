import { assertEquals } from "@std/assert";
import api from "../../health/api.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("api: the documented 401 {message} is a pass", async () => {
  const { ctx, calls } = mockCtx([{ status: 401, body: { message: "No API token provided" } }]);
  assertEquals((await api.check!({}, ctx)).state, "ok");
  assertEquals(calls[0].url, "https://api.mixmax.com/v1/users/me");
  assertEquals(calls[0].headers["x-api-token"], undefined);
});

Deno.test("api: 5xx is down, a 200 or an HTML 404 is degraded", async () => {
  assertEquals((await api.check!({}, mockCtx([{ status: 502, body: "" }]).ctx)).state, "down");
  assertEquals((await api.check!({}, mockCtx([{ body: { _id: "x" } }]).ctx)).state, "degraded");
  assertEquals(
    (await api.check!({}, mockCtx([{ status: 404, body: "<html>" }]).ctx)).state,
    "degraded",
  );
});

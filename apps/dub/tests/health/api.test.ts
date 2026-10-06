import { assert, assertEquals } from "@std/assert";
import check from "../../health/api.ts";
import { mockCtx } from "../_helpers.ts";

const LIVE_401 = {
  error: {
    code: "unauthorized",
    message: "Missing Authorization header.",
    doc_url: "https://dub.co/docs/api-reference/errors#unauthorized",
  },
};

Deno.test("api: is an unsigned dependency check on the app's own host", () => {
  assertEquals([check.kind, check.credential, check.severity], ["dependency", "none", "degraded"]);
  assertEquals(check.network, undefined);
});

Deno.test("api: the documented 401 envelope proves reachability and sends no credential", async () => {
  const { ctx, calls } = mockCtx([{ status: 401, body: LIVE_401 }]);
  const report = await check.check!({}, ctx);
  assertEquals(report.state, "ok");
  assertEquals(calls[0].url, "https://api.dub.co/links");
  assert(!("authorization" in calls[0].headers));
});

Deno.test("api: a 401 that is not Dub's envelope is degraded", async () => {
  const { ctx } = mockCtx([{ status: 401, body: "<html>login</html>" }]);
  assertEquals((await check.check!({}, ctx)).state, "degraded");
});

Deno.test("api: a 200 without a key is degraded — the API never answers that", async () => {
  const { ctx } = mockCtx([{ status: 200, body: [] }]);
  assertEquals((await check.check!({}, ctx)).state, "degraded");
});

Deno.test("api: a 5xx and a network failure are down", async () => {
  const five = mockCtx([{ status: 503, body: "" }]);
  assertEquals((await check.check!({}, five.ctx)).state, "down");
  const boom = {
    fetch: () => Promise.reject(new Error("tls")),
    log: () => {},
  } as unknown as typeof five.ctx;
  const report = await check.check!({}, boom);
  assertEquals(report.state, "down");
  assert(report.message!.includes("could not reach"));
});

Deno.test("api: an HTML 404 is degraded, not mistaken for the API", async () => {
  const { ctx } = mockCtx([{ status: 404, body: "<!DOCTYPE html>" }]);
  assertEquals((await check.check!({}, ctx)).state, "degraded");
});

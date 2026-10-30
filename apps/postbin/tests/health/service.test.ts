import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import service from "../../health/service.ts";

test("service: ok when the homepage responds 200", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: "" }]);
  const out = await service.check!({}, ctx);
  assertEquals(calls[0].url, "https://www.postb.in/");
  assertEquals(out.state, "ok");
});

test("service: down when the homepage responds with an error status", async () => {
  const { ctx } = mockCtx([{ status: 503, body: "" }]);
  const out = await service.check!({}, ctx);
  assertEquals(out.state, "down");
  assertEquals(out.message, "postb.in returned 503");
});

test("service: declares no credential and app scope", () => {
  assertEquals(service.credential, "none");
  assertEquals(service.scope, "app");
});

import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import service from "../../health/service.ts";

Deno.test("service: ok when the homepage responds 200", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: "" }]);
  const out = await service.check!({}, ctx);
  assertEquals(calls[0].url, "https://www.postb.in/");
  assertEquals(out.state, "ok");
});

Deno.test("service: down when the homepage responds with an error status", async () => {
  const { ctx } = mockCtx([{ status: 503, body: "" }]);
  const out = await service.check!({}, ctx);
  assertEquals(out.state, "down");
  assertEquals(out.message, "postb.in returned 503");
});

Deno.test("service: declares no credential and app scope", () => {
  assertEquals(service.credential, "none");
  assertEquals(service.scope, "app");
});

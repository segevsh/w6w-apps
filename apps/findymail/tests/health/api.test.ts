import { assert, assertEquals } from "@std/assert";
import api from "../../health/api.ts";
import { mockCtx } from "../_helpers.ts";
import type { HookContext } from "@w6w/types";

const run = (ctx: HookContext) => api.check!({} as never, ctx);

Deno.test("api: the documented 401 Unauthenticated envelope is a pass; the probe is unsigned", async () => {
  const { ctx, calls } = mockCtx([{ status: 401, body: { message: "Unauthenticated." } }]);
  assertEquals((await run(ctx)).state, "ok");
  assertEquals(new URL(calls[0].url).pathname, "/api/credits");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(calls[0].headers["accept"], "application/json");
});

Deno.test("api: a 401 without the JSON envelope, an unexpected 200 and a 4xx degrade", async () => {
  assertEquals((await run(mockCtx([{ status: 401, body: "<html/>" }]).ctx)).state, "degraded");
  assertEquals((await run(mockCtx([{ body: { credits: 1 } }]).ctx)).state, "degraded");
  assertEquals(
    (await run(mockCtx([{ status: 403, body: { message: "Forbidden" } }]).ctx)).state,
    "degraded",
  );
});

Deno.test("api: a 5xx and a network failure are down", async () => {
  assertEquals((await run(mockCtx([{ status: 503, body: "x" }]).ctx)).state, "down");
  const ctx = {
    fetch: () => Promise.reject(new Error("dns")),
    log: () => {},
  } as unknown as HookContext;
  const r = await run(ctx);
  assertEquals(r.state, "down");
  assert(r.message!.includes("could not reach"));
});

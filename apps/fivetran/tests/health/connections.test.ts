import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import connections from "../../health/connections.ts";

const list = (items: unknown[]) => ({
  status: 200,
  body: { code: "Success", data: { items } },
});

Deno.test("connections: all healthy is ok, with the count", async () => {
  const { ctx, calls } = mockCtx([list([
    { id: "c1", schema: "shop", status: { setup_state: "connected" } },
    { id: "c2", schema: "crm", status: { setup_state: "connected" } },
  ])]);
  const result = await connections.check!({}, ctx);
  assertEquals(calls[0].url, "https://api.fivetran.com/v1/connections?limit=100");
  assertEquals(result.state, "ok");
  assert(/2 connections/.test(result.message!), result.message);
});

/** A broken connection stops syncing silently — the warehouse stops changing. */
Deno.test("connections: a broken connection is down and is named", async () => {
  const { ctx } = mockCtx([list([
    { id: "c1", schema: "shop", status: { setup_state: "broken" } },
    { id: "c2", schema: "crm", status: { setup_state: "connected" } },
  ])]);
  const result = await connections.check!({}, ctx);
  assertEquals(result.state, "down");
  assert(/BROKEN and not syncing: shop/.test(result.message!), result.message);
});

/** Warnings mean the data is arriving and incomplete, which nothing else says. */
Deno.test("connections: warnings are degraded, not down", async () => {
  const { ctx } = mockCtx([list([
    { id: "c1", schema: "shop", status: { setup_state: "connected", warnings: [{ code: "x" }] } },
  ])]);
  const result = await connections.check!({}, ctx);
  assertEquals(result.state, "degraded");
  assert(/data may be incomplete/.test(result.message!), result.message);
});

/** Paused is somebody's decision; reporting it as broken trains people to ignore this. */
Deno.test("connections: a paused connection is counted and stays ok", async () => {
  const { ctx } = mockCtx([list([
    { id: "c1", schema: "shop", paused: true, status: { setup_state: "connected" } },
  ])]);
  const result = await connections.check!({}, ctx);
  assertEquals(result.state, "ok");
  assert(/1 paused deliberately/.test(result.message!), result.message);
});

Deno.test("connections: an account with none configured is ok", async () => {
  const { ctx } = mockCtx([list([])]);
  const result = await connections.check!({}, ctx);
  assertEquals(result.state, "ok");
  assert(/no connections configured/.test(result.message!), result.message);
});

/** The derived auth check owns credential failures. */
Deno.test("connections: a 401 is unknown and a 429 says why", async () => {
  const unauth = mockCtx([{ status: 401, body: "" }]);
  assertEquals((await connections.check!({}, unauth.ctx)).state, "unknown");

  const limited = mockCtx([{ status: 429, body: "" }]);
  const result = await connections.check!({}, limited.ctx);
  assertEquals(result.state, "unknown");
  assert(/500 requests an hour/.test(result.message!), result.message);
});

Deno.test("connections: any other failure is down", async () => {
  const { ctx } = mockCtx([{ status: 503, body: "" }]);
  assertEquals((await connections.check!({}, ctx)).state, "down");
});

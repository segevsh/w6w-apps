import { assertEquals } from "@std/assert";
import type { HookContext } from "@w6w/types";
import { mockCtx } from "../_helpers.ts";
import instance from "../../health/instance.ts";

const conn = { display: { baseUrl: "https://gotify.example.com" } };

Deno.test("instance: green health/database maps to ok", async () => {
  const { ctx, calls } = mockCtx(
    [{ status: 200, body: { health: "green", database: "green" } }],
    conn,
  );
  const report = await instance.check!({}, ctx);
  assertEquals(report.state, "ok");
  assertEquals(calls[0].headers["x-gotify-key"], undefined, "the instance check must be unsigned");
});

Deno.test("instance: orange health (500 response) maps to degraded, reading the body not the status", async () => {
  const { ctx } = mockCtx([{ status: 500, body: { health: "orange", database: "red" } }], conn);
  const report = await instance.check!({}, ctx);
  assertEquals(report.state, "degraded");
  assertEquals(report.message?.includes("database=red"), true, report.message);
});

Deno.test("instance: unreachable server reports down, not unknown", async () => {
  const ctx = {
    fetch: () => Promise.reject(new Error("connection refused")),
    log: () => {},
    connection: {
      id: "c",
      app: "io.w6w.gotify",
      auth: "client-token",
      owner: "u",
      state: "connected" as const,
      display: conn.display,
      createdAt: "2026-01-01T00:00:00Z",
    },
  };
  const report = await instance.check!({}, ctx as unknown as HookContext);
  assertEquals(report.state, "down");
});

Deno.test("instance: a 404 (wrong URL, or pre-2.1 Gotify) reports unknown, not down", async () => {
  const { ctx } = mockCtx([{ status: 404, body: "" }], conn);
  const report = await instance.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("instance: missing connection URL reports unknown", async () => {
  const { ctx } = mockCtx([]);
  const report = await instance.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

import { assertEquals } from "@std/assert";
import type { HookContext } from "@w6w/types";
import service from "../../health/service.ts";
import { encodeQuery } from "../../lib/wire.ts";
import {
  commandComplete,
  concatBytes,
  dataRow,
  errorResponse,
  mockCtx,
  readyForQuery,
  rowDescription,
} from "../_helpers.ts";

Deno.test("service: declares dependency/connection/signed/informational, not the kind:dependency defaults", () => {
  assertEquals(service.kind, "dependency");
  assertEquals(service.scope, "connection");
  assertEquals(service.credential, "signed");
  assertEquals(service.severity, "informational");
});

Deno.test("service: sends select 1 verbatim and reports ok on a clean ReadyForQuery", async () => {
  const { ctx, mock } = mockCtx([
    concatBytes(
      rowDescription(["?column?"]),
      dataRow(["1"]),
      commandComplete("SELECT 1"),
      readyForQuery(),
    ),
  ]);
  const report = await service.check!({}, ctx);
  assertEquals(mock.writes, [encodeQuery("select 1")]);
  assertEquals(report, { state: "ok" });
});

Deno.test("service: an ErrorResponse reports down with the server's message, not unknown", async () => {
  const { ctx } = mockCtx([
    errorResponse({ S: "ERROR", C: "57P03", M: "the database system is starting up" }),
  ]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "down");
  assertEquals(report.message, "the database system is starting up");
});

Deno.test("service: connection closing mid-probe reports down, not unknown", async () => {
  const { ctx } = mockCtx([]); // read() resolves null immediately — EOF
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "down");
});

Deno.test("service: a write/read that throws reports down with the error's message", async () => {
  const ctx: HookContext = {
    fetch: (() => {
      throw new Error("unused");
    }) as unknown as typeof fetch,
    log: () => {},
    socket: {
      write() {
        return Promise.reject(new Error("socket write failed."));
      },
      read() {
        return Promise.resolve(null);
      },
      close() {
        return Promise.resolve();
      },
    },
  };
  const report = await service.check!({}, ctx);
  assertEquals(report, { state: "down", message: "socket write failed." });
});

Deno.test("service: reports unknown (never down) when no socket was handed to it", async () => {
  const ctx: HookContext = { fetch: (() => {}) as unknown as typeof fetch, log: () => {} };
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

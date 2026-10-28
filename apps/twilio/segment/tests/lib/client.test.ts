import { assertEquals, assertThrows } from "@std/assert";
import {
  buildCommon,
  compact,
  parseJsonParam,
  requireIdentity,
  TRACKING_BASE,
} from "../../lib/client.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("TRACKING_BASE: is the write-side Tracking API host", () => {
  assertEquals(TRACKING_BASE, "https://api.segment.io/v1");
});

Deno.test("parseJsonParam: passes an already-parsed object through", () => {
  assertEquals(parseJsonParam({ a: 1 }), { a: 1 });
});

Deno.test("parseJsonParam: parses a JSON string", () => {
  assertEquals(parseJsonParam('{"a":1}'), { a: 1 });
});

Deno.test("parseJsonParam: undefined/null/empty-string are absent", () => {
  assertEquals(parseJsonParam(undefined), undefined);
  assertEquals(parseJsonParam(null), undefined);
  assertEquals(parseJsonParam(""), undefined);
  assertEquals(parseJsonParam("   "), undefined);
});

Deno.test("parseJsonParam: rejects a non-object JSON value", () => {
  assertThrows(() => parseJsonParam("42"), Error, "expected a JSON object");
  assertThrows(() => parseJsonParam(42), Error, "expected a JSON object");
});

Deno.test("requireIdentity: passes with either userId or anonymousId", () => {
  requireIdentity("u1", undefined);
  requireIdentity(undefined, "a1");
  requireIdentity("u1", "a1");
});

Deno.test("requireIdentity: throws with neither", () => {
  assertThrows(
    () => requireIdentity(undefined, undefined),
    Error,
    "either `userId` or `anonymousId` is required",
  );
});

Deno.test("compact: drops undefined, null and empty-string values", () => {
  assertEquals(compact({ a: "x", b: undefined, c: null, d: "", e: 0, f: false }), {
    a: "x",
    e: 0,
    f: false,
  });
});

Deno.test("buildCommon: reads context, integrations and timestamp off input", () => {
  const { ctx } = mockCtx();
  const common = buildCommon(
    {
      context: { ip: "1.2.3.4" },
      integrations: { All: true },
      timestamp: "2026-01-01T00:00:00.000Z",
    },
    ctx,
  );
  assertEquals(common.context, { ip: "1.2.3.4" });
  assertEquals(common.integrations, { All: true });
  assertEquals(common.timestamp, "2026-01-01T00:00:00.000Z");
});

Deno.test("buildCommon: stamps messageId from the invocation id when present", () => {
  const { ctx } = mockCtx([], { invocation: { invocationId: "inv-123" } });
  assertEquals(buildCommon({}, ctx).messageId, "inv-123");
});

Deno.test("buildCommon: omits messageId when there is no invocation", () => {
  const { ctx } = mockCtx();
  assertEquals(buildCommon({}, ctx).messageId, undefined);
});

Deno.test("buildCommon: omits fields the caller left unset", () => {
  const { ctx } = mockCtx();
  assertEquals(buildCommon({}, ctx), {});
});

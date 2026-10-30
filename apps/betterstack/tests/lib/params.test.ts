import { test } from "node:test";
import { assertEquals, assertThrows } from "../_assert.ts";
import {
  HEARTBEAT_KEYS,
  heartbeatBody,
  heartbeatFields,
  MONITOR_KEYS,
  monitorBody,
  monitorFields,
  pagingQuery,
} from "../../lib/params.ts";

test("monitorBody: parses the two JSON fields and drops empties", () => {
  assertEquals(
    monitorBody({
      monitor_type: "expected_status_code",
      expected_status_codes: "[200, 204]",
      request_headers: [{ name: "Accept", value: "x" }],
      url: "",
      team_name: "not-a-monitor-field",
    }),
    {
      monitor_type: "expected_status_code",
      expected_status_codes: [200, 204],
      request_headers: [{ name: "Accept", value: "x" }],
    },
  );
});

test("monitorBody: invalid JSON names the offending field", () => {
  assertThrows(() => monitorBody({ request_headers: "{oops" }), Error, "request_headers");
});

test("monitorFields: every form field is a sendable key and no key is duplicated", () => {
  const formKeys = monitorFields().map((p) => p.key);
  assertEquals(new Set(formKeys).size, formKeys.length);
  for (const k of formKeys) assertEquals((MONITOR_KEYS as readonly string[]).includes(k), true, k);
});

test("heartbeatFields: every form field is a sendable key", () => {
  for (const p of heartbeatFields()) {
    assertEquals((HEARTBEAT_KEYS as readonly string[]).includes(p.key), true, p.key);
  }
  assertEquals(heartbeatBody({ period: 60, name: "", team_name: "x" }), { period: 60 });
});

test("pagingQuery: passes page and per_page through", () => {
  assertEquals(pagingQuery({ page: 2, per_page: 50 }), { page: 2, per_page: 50 });
});

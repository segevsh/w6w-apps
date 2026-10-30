import { test } from "node:test";
import { assert, assertEquals, assertRejects, assertThrows } from "../_assert.ts";
import {
  BetterStackError,
  buildUrl,
  call,
  encodeId,
  errorMessage,
  flatten,
  listResources,
  pageInfo,
  parseJsonField,
  pick,
  redactUserinfo,
  scrubMonitor,
  scrubPolicy,
} from "../../lib/client.ts";
import { mockCtx, queryOf } from "../_helpers.ts";

test("buildUrl: drops unset, null and empty query values, keeps false and 0", () => {
  const url = buildUrl("/api/v2/monitors", {
    a: undefined,
    b: null,
    c: "",
    d: false,
    e: 0,
    f: "x y",
  });
  assertEquals(url.startsWith("https://uptime.betterstack.com/api/v2/monitors?"), true);
  assertEquals(queryOf(url), { d: "false", e: "0", f: "x y" });
});

test("encodeId: trims and encodes, and refuses an empty id", () => {
  assertEquals(encodeId(" 12/3 "), "12%2F3");
  assertEquals(encodeId(7), "7");
  assertThrows(() => encodeId("  "));
  assertThrows(() => encodeId(undefined));
});

test("errorMessage: string, object and absent shapes", () => {
  assertEquals(errorMessage({ errors: "Invalid Team API token." }), "Invalid Team API token.");
  assertEquals(errorMessage({ errors: { url: ["is invalid"] } }), '{"url":["is invalid"]}');
  assertEquals(errorMessage({}), undefined);
  assertEquals(errorMessage(null), undefined);
});

test("pick: drops undefined, null and empty string but keeps false and 0", () => {
  assertEquals(
    pick({ a: 1, b: undefined, c: null, d: "", e: false, f: 0, z: 9 }, [
      "a",
      "b",
      "c",
      "d",
      "e",
      "f",
    ]),
    { a: 1, e: false, f: 0 },
  );
});

test("parseJsonField: parses text, passes data through, names the field on failure", () => {
  assertEquals(parseJsonField("x", "[1,2]"), [1, 2]);
  assertEquals(parseJsonField("x", [1]), [1]);
  assertThrows(
    () => parseJsonField("expected_status_codes", "{nope"),
    Error,
    "expected_status_codes",
  );
});

test("flatten: lifts attributes, keeps id/type, exposes relationships' data", () => {
  const out = flatten({
    id: "5",
    type: "incident",
    attributes: { name: "n", id: "shadowed" },
    relationships: { monitor: { data: { id: "2", type: "monitor" } }, none: undefined },
  });
  assertEquals(out, {
    name: "n",
    id: "5",
    type: "incident",
    relationships: { monitor: { id: "2", type: "monitor" }, none: null },
  });
  assertEquals(flatten(null), {});
});

test("pageInfo: reads the page number from next and never needs its host", () => {
  assertEquals(
    pageInfo({ next: "https://incidents.betterstack.com/api/v2/monitors?page=2" }),
    { hasMore: true, nextPage: 2 },
  );
  assertEquals(pageInfo({ next: null }), { hasMore: false, nextPage: null });
  assertEquals(pageInfo(undefined), { hasMore: false, nextPage: null });
  assertEquals(pageInfo({ next: "not a url" }), { hasMore: true, nextPage: null });
});

test("call: sends JSON only when there is a body, and returns {} for a 204", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }, { body: { ok: true } }]);
  assertEquals(await call(ctx, "DELETE", "/api/v2/monitors/1"), {});
  assertEquals(calls[0].headers["content-type"], undefined);
  assertEquals(calls[0].body, null);

  await call(ctx, "POST", "/api/v2/monitors", { body: { url: "x" } });
  assertEquals(calls[1].headers["content-type"], "application/json");
  assertEquals(calls[1].body, '{"url":"x"}');
});

test("call: an empty body object is not sent", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await call(ctx, "POST", "/api/v3/incidents/1/resolve", { body: {} });
  assertEquals(calls[0].body, null);
});

test("call: a failure carries the status and the vendor's own message", async () => {
  const { ctx } = mockCtx([{ status: 409, body: { errors: "Incident was already acknowledged" } }]);
  const err = await assertRejects(
    () => call(ctx, "POST", "/api/v3/incidents/1/acknowledge"),
    BetterStackError,
  );
  assertEquals(err.status, 409);
  assertEquals(err.vendorMessage, "Incident was already acknowledged");
  assertEquals(err.message.includes("(409)"), true);
});

test("call: a non-JSON failure body does not crash the error path", async () => {
  const { ctx } = mockCtx([{ status: 502, body: "<html>bad gateway</html>", headers: {} }]);
  const err = await assertRejects(() => call(ctx, "GET", "/api/v2/monitors"), BetterStackError);
  assertEquals(err.status, 502);
});

test("listResources: flattens items, returns included, no pagination block means no more", async () => {
  const { ctx } = mockCtx([{
    body: {
      data: [{ id: "1", type: "on_call_calendar", attributes: { name: "A" } }],
      included: [{ id: "9", type: "user", attributes: { email: "a@example.com" } }],
    },
  }]);
  const out = await listResources(ctx, "/api/v2/on-calls", {});
  assertEquals(out.count, 1);
  assertEquals(out.hasMore, false);
  assertEquals(out.nextPage, null);
  assertEquals((out.included as Array<Record<string, unknown>>)[0].email, "a@example.com");
});

test("redactUserinfo: bare, scheme-prefixed and credential-free hosts", () => {
  assertEquals(redactUserinfo("user:pass@proxy.example.com"), "***@proxy.example.com");
  assertEquals(
    redactUserinfo("http://u:p@proxy.example.com:8080"),
    "http://***@proxy.example.com:8080",
  );
  assertEquals(redactUserinfo("proxy.example.com"), "proxy.example.com");
});

test("scrubMonitor: only sensitive header values and env values are redacted", () => {
  const out = scrubMonitor({
    auth_password: "pw",
    auth_username: "bob",
    proxy_host: "u:p@h",
    environment_variables: { A: "1" },
    request_headers: [
      { name: "X-Api-Key", value: "k" },
      { name: "Cookie", value: "c" },
      { name: "Content-Type", value: "application/xml" },
    ],
  });
  assert(!("auth_password" in out));
  assertEquals(out.auth_username, "bob");
  assertEquals(out.proxy_host, "***@h");
  assertEquals(out.environment_variables, { A: "[redacted]" });
  assertEquals(
    (out.request_headers as Array<{ value: string }>).map((h) => h.value),
    ["[redacted]", "[redacted]", "application/xml"],
  );
});

test("scrubMonitor: tolerates a monitor with none of the sensitive fields", () => {
  assertEquals(scrubMonitor({ url: "https://x", proxy_host: null }), {
    url: "https://x",
    proxy_host: null,
  });
});

test("scrubPolicy: drops incident_token and nothing else", () => {
  assertEquals(scrubPolicy({ name: "p", incident_token: "t" }), { name: "p" });
});

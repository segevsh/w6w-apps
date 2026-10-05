import { assert, assertEquals, assertThrows } from "@std/assert";
import {
  baseUrl,
  dateOnly,
  describeError,
  normalizeHost,
  normalizeTenant,
  paging,
  pathId,
  targetFromConnection,
  tokenUrl,
  toPage,
  WorkdayClient,
} from "../../lib/client.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("host: the three documented data-center shapes are accepted", () => {
  for (
    const h of [
      "wd2-impl-services1.workday.com",
      "wd5-services1.myworkday.com",
      "services1.wd503.myworkday.com",
      "WD2-IMPL-SERVICES1.WORKDAY.COM",
    ]
  ) assertEquals(normalizeHost(h), h.toLowerCase());
});

Deno.test("host: anything off the two suffixes, or not a bare hostname, is rejected", () => {
  for (
    const h of [
      "",
      "workday.com",
      "myworkday.com",
      "evil.com",
      "evilworkday.com",
      "wd2.workday.com.evil.com",
      "wd2.workday.com@evil.com",
      "https://wd2.workday.com",
      "wd2.workday.com/ccx",
      "wd2.workday.com:8443",
      "wd2.workday.com.",
      "wd2.workday.co",
      "-bad.workday.com",
      "a b.workday.com",
      "127.0.0.1",
    ]
  ) assertThrows(() => normalizeHost(h), Error, "host", h);
});

Deno.test("tenant: letters, digits, underscore, hyphen only", () => {
  assertEquals(normalizeTenant("acme_impl1"), "acme_impl1");
  assertEquals(normalizeTenant("acme-prod"), "acme-prod");
  for (const t of ["", "a/b", "a b", "../x", "a?b", "a#b", "_x"]) {
    assertThrows(() => normalizeTenant(t), Error, "tenant", t);
  }
});

Deno.test("urls: base and token URLs follow /ccx/api and /ccx/oauth2", () => {
  const t = { host: "wd5-services1.myworkday.com", tenant: "acme" };
  assertEquals(
    baseUrl(t, "staffing"),
    "https://wd5-services1.myworkday.com/ccx/api/staffing/v7/acme",
  );
  assertEquals(baseUrl(t, "common"), "https://wd5-services1.myworkday.com/ccx/api/v1/acme");
  assertEquals(
    baseUrl(t, "absenceManagement"),
    "https://wd5-services1.myworkday.com/ccx/api/absenceManagement/v5/acme",
  );
  assertEquals(baseUrl(t, "person"), "https://wd5-services1.myworkday.com/ccx/api/person/v4/acme");
  assertEquals(
    baseUrl(t, "timeTracking"),
    "https://wd5-services1.myworkday.com/ccx/api/timeTracking/v7/acme",
  );
  assertEquals(tokenUrl(t), "https://wd5-services1.myworkday.com/ccx/oauth2/acme/token");
});

Deno.test("connection: a connection without host/tenant, or with a bad host, is refused", () => {
  assertThrows(() => targetFromConnection(undefined), Error, "reconnect");
  assertThrows(
    () => targetFromConnection({ display: { host: "evil.com", tenant: "t" } }),
    Error,
    "host",
  );
});

Deno.test("pathId: IDs, reference IDs and `me` pass; paths are refused", () => {
  assertEquals(pathId("me", "x"), "me");
  assertEquals(pathId("Employee_ID=21001", "x"), "Employee_ID%3D21001");
  for (const bad of ["", "a/b", "..", "a?x=1", "a b", "a#b"]) {
    assertThrows(() => pathId(bad, "workerId"), Error, "workerId", bad);
  }
});

Deno.test("paging and dates validate before any call", () => {
  assertEquals(paging({ limit: "50", offset: 0 }), { limit: 50, offset: 0 });
  assertEquals(paging({}), {});
  assertThrows(() => paging({ limit: 0 }), Error, "1 to 100");
  assertThrows(() => paging({ offset: -1 }), Error, "offset");
  assertEquals(dateOnly("2026-10-05", "d"), "2026-10-05");
  assertEquals(dateOnly("", "d"), undefined);
  assertThrows(() => dateOnly("2026-13-45", "d"), Error, "yyyy-mm-dd");
});

Deno.test("toPage: hasMore from total, tolerant of a missing body", () => {
  assertEquals(toPage({ total: 3, data: [1, 2] }, 0).hasMore, true);
  assertEquals(toPage({ total: 3, data: [3] }, 2).hasMore, false);
  assertEquals(toPage(null), { items: [], total: 0, count: 0, hasMore: false });
});

Deno.test("describeError: Workday's error + errors[] shape, and per-status explanations", () => {
  const body = JSON.stringify({
    error: "Validation error",
    errors: [{ error: "bad", field: "date" }],
  });
  assert(describeError(400, body).includes("date: bad"));
  assert(/refresh token/.test(describeError(401, "")));
  assert(/Integration System User/.test(describeError(403, "")));
  assert(/service version/.test(describeError(404, "")));
});

Deno.test("client: the request sets accept JSON and never an auth header", async () => {
  const { ctx, calls } = mockCtx([{ body: { total: 0, data: [] } }], {
    display: { host: "wd2-impl-services1.workday.com", tenant: "t1" },
  });
  await new WorkdayClient(ctx).request("staffing", "/jobs", { query: { limit: 1, x: ["a", "b"] } });
  assertEquals(
    calls[0].url,
    "https://wd2-impl-services1.workday.com/ccx/api/staffing/v7/t1/jobs?limit=1&x=a&x=b",
  );
  assertEquals(calls[0].headers, { accept: "application/json" });
});

Deno.test("client: a non-JSON 200 is an error, an empty body is null", async () => {
  const d = { display: { host: "wd2-impl-services1.workday.com", tenant: "t1" } };
  const a = mockCtx([{ body: "<html>sso</html>" }], d);
  const err = await new WorkdayClient(a.ctx).request("staffing", "/jobs").catch((e) => e);
  assert(/non-JSON/.test(String(err)));
  const b = mockCtx([{ status: 200 }], d);
  assertEquals(await new WorkdayClient(b.ctx).request("staffing", "/jobs"), null);
});

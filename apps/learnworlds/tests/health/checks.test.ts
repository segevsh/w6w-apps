import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import service, { STATUS_URL } from "../../health/service.ts";
import school from "../../health/school.ts";
import quota from "../../health/quota.ts";

const conn = { display: { schoolDomain: "https://yourschool.learnworlds.com" } };

test("service: reports ok from a real-shaped 'All Systems Operational' summary", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: {
      page: { id: "1", name: "Learnworlds Status Page", url: "https://status.learnworlds.com/" },
      status: { indicator: "none", description: "All Systems Operational" },
      components: [
        { id: "c1", name: "Schools", status: "operational" },
        { id: "c2", name: "Databases", status: "operational" },
      ],
    },
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "ok");
  assertEquals(calls[0].url, STATUS_URL);
  assertEquals(service.kind, "service");
  assertEquals(service.credential, "none");
});

test("service: a degraded component maps to a degraded verdict", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: {
      page: { url: "https://status.learnworlds.com/" },
      status: { indicator: "minor" },
      components: [{ id: "c1", name: "Schools", status: "degraded_performance" }],
    },
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "degraded");
  assert(report.message!.includes("Schools"), report.message);
});

test("service: a major outage maps to down", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: {
      page: { url: "https://status.learnworlds.com/" },
      status: { indicator: "critical" },
      components: [{ id: "c1", name: "Schools", status: "major_outage" }],
    },
  }]);
  assertEquals((await service.check!({}, ctx)).state, "down");
});

test("service: a broken status API is unknown, never down", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "" }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

test("service: a page that no longer self-identifies as LearnWorlds' is unknown", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: {
      page: { url: "https://status.example.com/" },
      status: { indicator: "none" },
      components: [],
    },
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

test("school: an unsigned 400 'missing client_id' response is a pass, not an outage", async () => {
  const { ctx, calls } = mockCtx([
    {
      status: 400,
      body: {
        errors: [{
          code: 400,
          context: "client_id",
          message: "Missing client_id or client cannot be found.",
        }],
        success: false,
      },
    },
  ], conn);
  const report = await school.check!({}, ctx);
  assertEquals(report.state, "ok");
  assertEquals(calls[0].url, "https://yourschool.learnworlds.com/admin/api/v2/courses");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(school.kind, "dependency");
  assertEquals(school.scope, "connection");
  assertEquals(school.credential, "context");
});

test("school: a 401 is also a pass — credential validity is auth:*'s job", async () => {
  const { ctx } = mockCtx([{ status: 401, body: {} }], conn);
  assertEquals((await school.check!({}, ctx)).state, "ok");
});

test("school: a redirect to a marketing page (deleted school) is down", async () => {
  const { ctx } = mockCtx([{
    status: 302,
    headers: { location: "https://www.learnworlds.com/deleted" },
  }], conn);
  const report = await school.check!({}, ctx);
  assertEquals(report.state, "down");
  assert(report.message!.includes("deleted or renamed"), report.message);
});

test("school: a 404 is down", async () => {
  const { ctx } = mockCtx([{ status: 404, body: "" }], conn);
  assertEquals((await school.check!({}, ctx)).state, "down");
});

test("school: a connection with no domain is unknown", async () => {
  const { ctx } = mockCtx([], { display: {} });
  const report = await school.check!({}, ctx);
  assertEquals(report.state, "unknown");
  assert(report.message!.includes("no school domain"), report.message);
});

test("quota: is a declared absence, and explains why the question does not apply", () => {
  assertEquals(quota.check, undefined);
  assertEquals(quota.severity, "informational");
  const reason = quota.unavailable!.reason;
  assert(reason.toLowerCase().includes("rate-limit"), reason);
});

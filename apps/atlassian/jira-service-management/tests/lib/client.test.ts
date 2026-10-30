import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import { baseFromConnection, JsmClient, readErrorDetail } from "../../lib/client.ts";

test("baseFromConnection: prefers cloudId (OAuth gateway) over site", () => {
  const base = baseFromConnection({
    id: "c1",
    app: "io.w6w.jira-service-management",
    auth: "oauth2",
    status: "live",
    display: { site: "acme", cloudId: "cloud-1" },
  } as never);
  assertEquals(base, "https://api.atlassian.com/ex/jira/cloud-1/rest/servicedeskapi");
});

test("baseFromConnection: falls back to the site host", () => {
  const base = baseFromConnection({
    id: "c1",
    app: "io.w6w.jira-service-management",
    auth: "api-token",
    status: "live",
    display: { site: "acme" },
  } as never);
  assertEquals(base, "https://acme.atlassian.net/rest/servicedeskapi");
});

test("baseFromConnection: throws when neither is recorded", () => {
  try {
    baseFromConnection({
      id: "c1",
      app: "io.w6w.jira-service-management",
      auth: "api-token",
      status: "live",
      display: {},
    } as never);
    throw new Error("expected to throw");
  } catch (e) {
    assertEquals((e as Error).message.includes("neither a site nor a cloud id"), true);
  }
});

test("JsmClient: appends repeated query params for arrays", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  (ctx as { connection?: unknown }).connection = { display: { site: "acme" } };
  await new JsmClient(ctx).request("/request", { query: { expand: ["sla", "status"] } });
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.getAll("expand"), ["sla", "status"]);
});

test("JsmClient: returns undefined on 204 with no body", async () => {
  const { ctx } = mockCtx([{ status: 204 }]);
  (ctx as { connection?: unknown }).connection = { display: { site: "acme" } };
  const out = await new JsmClient(ctx).request("/request/HD-1/transition", { method: "POST" });
  assertEquals(out, undefined);
});

test("JsmClient: throws with the parsed error detail on a non-2xx response", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { errorMessage: "requestTypeId is required" } }]);
  (ctx as { connection?: unknown }).connection = { display: { site: "acme" } };
  await assertRejects(
    () => new JsmClient(ctx).request("/request", { method: "POST", body: {} }),
    Error,
    "requestTypeId is required",
  );
});

test("readErrorDetail: falls back to raw text for a non-JSON body", async () => {
  const res = new Response("Client must be authenticated to access this resource.", {
    status: 401,
    headers: { "content-type": "text/html;charset=UTF-8" },
  });
  const detail = await readErrorDetail(res);
  assertEquals(detail, "Client must be authenticated to access this resource.");
});

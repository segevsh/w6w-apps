import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/incident-list.ts";

Deno.test("incident-list: default limit stops after the first page", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { incidents: [{ id: "P1" }, { id: "P2" }], more: false } },
  ]);
  const result = await action.execute!({}, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].url, "https://api.pagerduty.com/incidents?limit=100&offset=0");
  assertEquals(result, [{ id: "P1" }, { id: "P2" }]);
});

Deno.test("incident-list: a small `limit` stops fetching once reached, even if `more` is true", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { incidents: [{ id: "P1" }, { id: "P2" }], more: true } },
  ]);
  const result = await action.execute!({ limit: 2 }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(result, [{ id: "P1" }, { id: "P2" }]);
});

Deno.test("incident-list: returnAll paginates until `more` is false", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { incidents: [{ id: "P1" }], more: true } },
    { status: 200, body: { incidents: [{ id: "P2" }], more: false } },
  ]);
  const result = await action.execute!({ returnAll: true }, ctx);
  assertEquals(calls.length, 2);
  assertEquals(calls[1].url, "https://api.pagerduty.com/incidents?limit=100&offset=100");
  assertEquals(result, [{ id: "P1" }, { id: "P2" }]);
});

Deno.test("incident-list: filters map to bracketed array query params", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { incidents: [], more: false } }]);
  await action.execute!({
    statuses: ["triggered", "acknowledged"],
    serviceIds: "SV1, SV2",
    userIds: "U1",
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.getAll("statuses[]"), ["triggered", "acknowledged"]);
  assertEquals(url.searchParams.getAll("service_ids[]"), ["SV1", "SV2"]);
  assertEquals(url.searchParams.getAll("user_ids[]"), ["U1"]);
});

Deno.test("incident-list: accept header is set", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { incidents: [], more: false } }]);
  await action.execute!({}, ctx);
  assertEquals(calls[0].headers["accept"], "application/vnd.pagerduty+json;version=2");
});

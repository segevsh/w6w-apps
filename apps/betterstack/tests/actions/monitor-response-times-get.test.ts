import { assertEquals, assertRejects } from "@std/assert";
import monitorResponseTimesGet from "../../actions/monitor-response-times-get.ts";
import { jsonBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("monitor-response-times-get: GET /api/v2/monitors/{monitor_id}/response-times", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: {
      "data": {
        "id": "42",
        "type": "monitor_response_times",
        "attributes": {
          "regions": [{
            "region": "us",
            "response_times": [{ "at": "2026-10-06T00:00:00.000Z", "response_time": 0.47 }],
          }],
        },
      },
    },
  }]);
  const out = await monitorResponseTimesGet.execute({ "monitor_id": "42" }, ctx) as Record<
    string,
    unknown
  >;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v2/monitors/42/response-times");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(jsonBody(calls[0]), null);
  assertEquals(calls[0].url.startsWith("https://uptime.betterstack.com/"), true);
  assertEquals((out.regions as Array<{ region: string }>)[0].region, "us");
});

Deno.test("monitor-response-times-get: puts no credential on the request (sign owns that)", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: {
      "data": {
        "id": "42",
        "type": "monitor_response_times",
        "attributes": {
          "regions": [{
            "region": "us",
            "response_times": [{ "at": "2026-10-06T00:00:00.000Z", "response_time": 0.47 }],
          }],
        },
      },
    },
  }]);
  await monitorResponseTimesGet.execute({ "monitor_id": "42" }, ctx);
  assertEquals(calls[0].headers.authorization, undefined);
});

Deno.test("monitor-response-times-get: a vendor error surfaces its own message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { errors: "Invalid Team API token." } }]);
  const err = await assertRejects(async () =>
    await monitorResponseTimesGet.execute({ "monitor_id": "42" }, ctx)
  ) as Error;
  assertEquals(err.message.includes("(401)"), true);
  assertEquals(err.message.includes("Invalid Team API token."), true);
});

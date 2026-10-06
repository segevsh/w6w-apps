import { assert, assertEquals, assertRejects } from "@std/assert";
import getStatistics from "../../actions/get-statistics.ts";
import { errBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const sample = {
  "startDate": "2026-09-01T00:00:00Z",
  "endDate": "2026-09-30T23:59:59Z",
};
const run = (
  ctx: Parameters<typeof getStatistics.execute>[1],
  input: Record<string, unknown> = sample,
) => getStatistics.execute(input as never, ctx) as Promise<unknown>;

Deno.test("get-statistics: declares a read action with a description, params and output", () => {
  assertEquals(getStatistics.key, "get-statistics");
  assertEquals(getStatistics.type, "read");
  assert((getStatistics.description ?? "").length > 0);
  assert(Array.isArray(getStatistics.output) && getStatistics.output.length > 0);
  assertEquals(getStatistics.idempotent, undefined);
});

Deno.test("get-statistics: sends the documented request and returns the documented shape", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      "balance": 900,
      "point": 0,
      "refund": {
        "balance": 0,
        "point": 0,
      },
      "total": {
        "sms": 50,
      },
      "successed": {
        "sms": 48,
      },
      "failed": {
        "sms": 2,
      },
      "monthPeriod": [
        {
          "date": "2026-09",
        },
      ],
      "dayPeriod": [
        {
          "date": "2026-09-01",
        },
      ],
    },
  }]);
  const out = await run(ctx);
  assertEquals(out, {
    "balance": 900,
    "point": 0,
    "refund": {
      "balance": 0,
      "point": 0,
    },
    "total": {
      "sms": 50,
    },
    "successed": {
      "sms": 48,
    },
    "failed": {
      "sms": 2,
    },
    "monthPeriod": [
      {
        "date": "2026-09",
      },
    ],
    "dayPeriod": [
      {
        "date": "2026-09-01",
      },
    ],
  });
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/messages/v4/statistics");
  assertEquals(calls[0].url.startsWith("https://api.solapi.com/"), true);
  assertEquals(queryOf(calls[0].url), {
    "startDate": "2026-09-01T00:00:00Z",
    "endDate": "2026-09-30T23:59:59Z",
  });
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), null);
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("get-statistics: a SOLAPI error body is thrown with its code and message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: errBody("Unauthorized", "no permission") }]);
  await assertRejects(() => run(ctx), Error, "SOLAPI 401: Unauthorized: no permission");
});

import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-campaign-metrics.ts";

Deno.test("get-campaign-metrics: metadata", () => {
  assertEquals(action.key, "get-campaign-metrics");
  assertEquals(action.type, "read");
  assertEquals(action.params?.map((p) => p.key), ["campaignId", "startDateTime", "endDateTime"]);
});

Deno.test("get-campaign-metrics: calls GET /campaigns/metrics on the US host", async () => {
  const { ctx, calls } = mockCtx([{
    body: "id,name\n1,x\n",
    headers: { "content-type": "text/plain" },
  }]);
  const out = await action.execute({
    "campaignId": [1, 2],
    "startDateTime": "abc",
    "endDateTime": "abc",
  }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(
    calls[0].url,
    "https://api.iterable.com/api/campaigns/metrics?campaignId=1&campaignId=2&startDateTime=abc&endDateTime=abc",
  );
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(calls[0].body, null);
  assertEquals(out, { csv: "id,name\n1,x\n" });
});

Deno.test("get-campaign-metrics: uses the EU host when the connection region is eu", async () => {
  const { ctx, calls } = mockCtx([{
    body: "id,name\n1,x\n",
    headers: { "content-type": "text/plain" },
  }], { connection: { display: { region: "eu" } } });
  await action.execute({ "campaignId": [1, 2], "startDateTime": "abc", "endDateTime": "abc" }, ctx);
  assertEquals(
    calls[0].url,
    "https://api.eu.iterable.com/api/campaigns/metrics?campaignId=1&campaignId=2&startDateTime=abc&endDateTime=abc",
  );
});

Deno.test("get-campaign-metrics: rejects a missing `campaignId` without calling Iterable", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => {
      await action.execute({ "startDateTime": "abc", "endDateTime": "abc" }, ctx);
    },
    Error,
    "`campaignId` is required",
  );
  assertEquals(calls.length, 0);
});

Deno.test("get-campaign-metrics: surfaces an HTTP error with Iterable's own code", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { code: "BadParams", msg: "nope" } }]);
  await assertRejects(
    async () => {
      await action.execute(
        { "campaignId": [1, 2], "startDateTime": "abc", "endDateTime": "abc" },
        ctx,
      );
    },
    Error,
    "BadParams: nope",
  );
});

Deno.test("get-campaign-metrics: treats a 200 carrying a non-Success code as a failure", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { code: "RateLimitExceeded", msg: "slow down" } }]);
  await assertRejects(
    async () => {
      await action.execute(
        { "campaignId": [1, 2], "startDateTime": "abc", "endDateTime": "abc" },
        ctx,
      );
    },
    Error,
    "RateLimitExceeded: slow down",
  );
});

import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-campaigns.ts";

Deno.test("list-campaigns: metadata", () => {
  assertEquals(action.key, "list-campaigns");
  assertEquals(action.type, "read");
  assertEquals(action.params?.map((p) => p.key), ["page", "pageSize", "sort", "campaignState"]);
});

Deno.test("list-campaigns: calls GET /campaigns on the US host", async () => {
  const { ctx, calls } = mockCtx([{ body: { "campaigns": [{ "id": 1 }] } }]);
  const out = await action.execute({
    "page": 7,
    "pageSize": 7,
    "sort": "abc",
    "campaignState": ["Running", "Draft"],
  }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(
    calls[0].url,
    "https://api.iterable.com/api/campaigns?page=7&pageSize=7&sort=abc&campaignState=Running&campaignState=Draft",
  );
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(calls[0].body, null);
  assertEquals(out, { "campaigns": [{ "id": 1 }] });
});

Deno.test("list-campaigns: uses the EU host when the connection region is eu", async () => {
  const { ctx, calls } = mockCtx([{ body: { "campaigns": [{ "id": 1 }] } }], {
    connection: { display: { region: "eu" } },
  });
  await action.execute({
    "page": 7,
    "pageSize": 7,
    "sort": "abc",
    "campaignState": ["Running", "Draft"],
  }, ctx);
  assertEquals(
    calls[0].url,
    "https://api.eu.iterable.com/api/campaigns?page=7&pageSize=7&sort=abc&campaignState=Running&campaignState=Draft",
  );
});

Deno.test("list-campaigns: surfaces an HTTP error with Iterable's own code", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { code: "BadParams", msg: "nope" } }]);
  await assertRejects(
    async () => {
      await action.execute({
        "page": 7,
        "pageSize": 7,
        "sort": "abc",
        "campaignState": ["Running", "Draft"],
      }, ctx);
    },
    Error,
    "BadParams: nope",
  );
});

Deno.test("list-campaigns: treats a 200 carrying a non-Success code as a failure", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { code: "RateLimitExceeded", msg: "slow down" } }]);
  await assertRejects(
    async () => {
      await action.execute({
        "page": 7,
        "pageSize": 7,
        "sort": "abc",
        "campaignState": ["Running", "Draft"],
      }, ctx);
    },
    Error,
    "RateLimitExceeded: slow down",
  );
});

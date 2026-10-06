import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-push-template.ts";

Deno.test("get-push-template: metadata", () => {
  assertEquals(action.key, "get-push-template");
  assertEquals(action.type, "read");
  assertEquals(action.params?.map((p) => p.key), ["templateId", "locale"]);
});

Deno.test("get-push-template: calls GET /templates/push/get on the US host", async () => {
  const { ctx, calls } = mockCtx([{ body: { "templateId": 3, "name": "T" } }]);
  const out = await action.execute({ "templateId": 7, "locale": "abc" }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(
    calls[0].url,
    "https://api.iterable.com/api/templates/push/get?templateId=7&locale=abc",
  );
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(calls[0].body, null);
  assertEquals(out, { "templateId": 3, "name": "T" });
});

Deno.test("get-push-template: uses the EU host when the connection region is eu", async () => {
  const { ctx, calls } = mockCtx([{ body: { "templateId": 3, "name": "T" } }], {
    connection: { display: { region: "eu" } },
  });
  await action.execute({ "templateId": 7, "locale": "abc" }, ctx);
  assertEquals(
    calls[0].url,
    "https://api.eu.iterable.com/api/templates/push/get?templateId=7&locale=abc",
  );
});

Deno.test("get-push-template: rejects a missing `templateId` without calling Iterable", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => {
      await action.execute({ "locale": "abc" }, ctx);
    },
    Error,
    "`templateId` is required",
  );
  assertEquals(calls.length, 0);
});

Deno.test("get-push-template: surfaces an HTTP error with Iterable's own code", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { code: "BadParams", msg: "nope" } }]);
  await assertRejects(
    async () => {
      await action.execute({ "templateId": 7, "locale": "abc" }, ctx);
    },
    Error,
    "BadParams: nope",
  );
});

Deno.test("get-push-template: treats a 200 carrying a non-Success code as a failure", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { code: "RateLimitExceeded", msg: "slow down" } }]);
  await assertRejects(
    async () => {
      await action.execute({ "templateId": 7, "locale": "abc" }, ctx);
    },
    Error,
    "RateLimitExceeded: slow down",
  );
});

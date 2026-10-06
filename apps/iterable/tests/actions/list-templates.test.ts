import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-templates.ts";

Deno.test("list-templates: metadata", () => {
  assertEquals(action.key, "list-templates");
  assertEquals(action.type, "read");
  assertEquals(action.params?.map((p) => p.key), [
    "templateType",
    "messageMedium",
    "startDateTime",
    "endDateTime",
    "page",
    "pageSize",
    "sort",
  ]);
});

Deno.test("list-templates: calls GET /templates on the US host", async () => {
  const { ctx, calls } = mockCtx([{ body: { "templates": [{ "templateId": 1 }] } }]);
  const out = await action.execute({
    "templateType": "Base",
    "messageMedium": "Email",
    "startDateTime": "abc",
    "endDateTime": "abc",
    "page": 7,
    "pageSize": 7,
    "sort": "abc",
  }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(
    calls[0].url,
    "https://api.iterable.com/api/templates?templateType=Base&messageMedium=Email&startDateTime=abc&endDateTime=abc&page=7&pageSize=7&sort=abc",
  );
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(calls[0].body, null);
  assertEquals(out, { "templates": [{ "templateId": 1 }] });
});

Deno.test("list-templates: uses the EU host when the connection region is eu", async () => {
  const { ctx, calls } = mockCtx([{ body: { "templates": [{ "templateId": 1 }] } }], {
    connection: { display: { region: "eu" } },
  });
  await action.execute({
    "templateType": "Base",
    "messageMedium": "Email",
    "startDateTime": "abc",
    "endDateTime": "abc",
    "page": 7,
    "pageSize": 7,
    "sort": "abc",
  }, ctx);
  assertEquals(
    calls[0].url,
    "https://api.eu.iterable.com/api/templates?templateType=Base&messageMedium=Email&startDateTime=abc&endDateTime=abc&page=7&pageSize=7&sort=abc",
  );
});

Deno.test("list-templates: surfaces an HTTP error with Iterable's own code", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { code: "BadParams", msg: "nope" } }]);
  await assertRejects(
    async () => {
      await action.execute({
        "templateType": "Base",
        "messageMedium": "Email",
        "startDateTime": "abc",
        "endDateTime": "abc",
        "page": 7,
        "pageSize": 7,
        "sort": "abc",
      }, ctx);
    },
    Error,
    "BadParams: nope",
  );
});

Deno.test("list-templates: treats a 200 carrying a non-Success code as a failure", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { code: "RateLimitExceeded", msg: "slow down" } }]);
  await assertRejects(
    async () => {
      await action.execute({
        "templateType": "Base",
        "messageMedium": "Email",
        "startDateTime": "abc",
        "endDateTime": "abc",
        "page": 7,
        "pageSize": 7,
        "sort": "abc",
      }, ctx);
    },
    Error,
    "RateLimitExceeded: slow down",
  );
});

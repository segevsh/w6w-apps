import { assertEquals, assertRejects } from "@std/assert";
import webhookList from "../../actions/webhook-list.ts";
import { collection, errorsBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

type Out = { data: unknown[]; nextCursor?: string; meta: Record<string, unknown> };

Deno.test("webhook-list: GET /webhooks with JSON:API headers and cheap defaults", async () => {
  const { ctx, calls } = mockCtx([{ body: collection("webhook", [1, 2]) }]);
  const out = await webhookList.execute({}, ctx) as Out;

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v2/webhooks");
  assertEquals(calls[0].headers["content-type"], "application/vnd.api+json");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(queryOf(calls[0].url), { "page[size]": "25", count: "false" });
  assertEquals(out.data.length, 2);
  assertEquals(out.nextCursor, undefined);
});

Deno.test("webhook-list: filters, sort, include, sparse fields and cursor are sent in Outreach's grammar", async () => {
  const { ctx, calls } = mockCtx([{ body: collection("webhook", []) }]);
  await webhookList.execute({
    filter: { id: "1..5", owner: { id: "7" }, name: ["a", "b"] },
    sort: "-updatedAt",
    include: "owner",
    fields: "name",
    pageSize: 100,
    after: "abc",
    count: true,
  }, ctx);

  assertEquals(queryOf(calls[0].url), {
    "filter[id]": "1..5",
    "filter[owner][id]": "7",
    "filter[name]": "a,b",
    sort: "-updatedAt",
    include: "owner",
    "fields[webhook]": "name",
    "page[size]": "100",
    "page[after]": "abc",
    count: "true",
  });
});

Deno.test("webhook-list: a JSON-string filter is accepted", async () => {
  const { ctx, calls } = mockCtx([{ body: collection("webhook", []) }]);
  await webhookList.execute({ filter: '{"state":"incomplete"}' }, ctx);
  assertEquals(queryOf(calls[0].url)["filter[state]"], "incomplete");
});

Deno.test("webhook-list: extracts the next page cursor from links.next", async () => {
  const next = "https://api.outreach.io/api/v2/webhooks?page[size]=2&page[after]=eyJ4Ijox";
  const { ctx } = mockCtx([{ body: collection("webhook", [1, 2], next) }]);
  const out = await webhookList.execute({ pageSize: 2 }, ctx) as Out;
  assertEquals(out.nextCursor, "eyJ4Ijox");
});

Deno.test("webhook-list: surfaces the vendor's error id and detail", async () => {
  const { ctx } = mockCtx([{
    status: 403,
    body: errorsBody("unauthorizedOauthScope", "Unauthorized OAuth Scope", "Missing scope"),
  }]);
  await assertRejects(
    async () => await webhookList.execute({}, ctx),
    Error,
    "unauthorizedOauthScope: Missing scope",
  );
});

Deno.test("webhook-list: strips secret and cleanupToken from every webhook", async () => {
  const body = {
    data: [
      {
        type: "webhook",
        id: 1,
        attributes: { url: "https://x.test/h", secret: "s3cr3t", cleanupToken: "eyJ.tok" },
      },
    ],
  };
  const { ctx } = mockCtx([{ body }]);
  const out = await webhookList.execute({}, ctx) as {
    data: Array<{ attributes: Record<string, unknown> }>;
  };
  assertEquals(out.data[0].attributes, { url: "https://x.test/h" });
  assertEquals(JSON.stringify(out).includes("s3cr3t"), false);
});

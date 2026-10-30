import { test } from "node:test";
import { assertEquals, assertRejects, assertThrows } from "../_assert.ts";
import { mockCtx, mockJiraCtx } from "../_helpers.ts";
import { adf, baseFromConnection, compact, JiraClient, unset } from "../../lib/client.ts";

test("client: an API-token connection talks to the site host", async () => {
  const { ctx, calls } = mockJiraCtx([{ body: { key: "ENG-1" } }], { site: "acme" });
  await new JiraClient(ctx).request("/issue/ENG-1");
  assertEquals(calls[0].url, "https://acme.atlassian.net/rest/api/3/issue/ENG-1");
  assertEquals("authorization" in calls[0].headers, false);
});

test("client: an OAuth connection talks to the Atlassian gateway instead", async () => {
  const { ctx, calls } = mockJiraCtx([{ body: {} }], { cloudId: "cloud-1" });
  await new JiraClient(ctx).request("/issue/ENG-1");
  assertEquals(
    calls[0].url,
    "https://api.atlassian.com/ex/jira/cloud-1/rest/api/3/issue/ENG-1",
  );
});

test("client: the cloud id wins when a connection somehow has both", () => {
  assertEquals(
    baseFromConnection({ display: { site: "acme", cloudId: "c1" } } as never),
    "https://api.atlassian.com/ex/jira/c1/rest/api/3",
  );
});

test("client: fails loudly when the connection identifies no instance", () => {
  const { ctx } = mockCtx();
  assertThrows(() => new JiraClient(ctx), Error, "neither a site nor a cloud id");
});

test("client: surfaces Jira's field-level error body", async () => {
  const { ctx } = mockJiraCtx([{
    status: 400,
    statusText: "Bad Request",
    body: '{"errorMessages":[],"errors":{"summary":"Summary is required."}}',
  }]);
  await assertRejects(
    () => new JiraClient(ctx).request("/issue", { method: "POST", body: {} }),
    Error,
    "Summary is required.",
  );
});

test("adf: wraps plain text in the document shape v3 requires", () => {
  assertEquals(adf("hello"), {
    type: "doc",
    version: 1,
    content: [{ type: "paragraph", content: [{ type: "text", text: "hello" }] }],
  });
});

test("adf: splits blank-line-separated blocks into paragraphs", () => {
  const doc = adf("one\n\ntwo") as { content: unknown[] };
  assertEquals(doc.content.length, 2);
});

test("adf: passes an object through untouched, and drops the empty case", () => {
  const custom = { type: "doc", version: 1, content: [] };
  assertEquals(adf(custom), custom);
  assertEquals(adf(""), undefined);
  assertEquals(adf(undefined), undefined);
});

test("compact/unset behave as the other apps' helpers do", () => {
  assertEquals(compact({ a: 0, b: undefined, c: null }), { a: 0 });
  assertEquals(unset(""), undefined);
});

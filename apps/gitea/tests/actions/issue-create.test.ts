import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/issue-create.ts";

const conn = { display: { baseUrl: "https://git.example.com", owner: "acme" } };

Deno.test("issue-create: POSTs to the repository's issues", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { number: 7 } }], conn);
  await action.execute!({ repo: "web", title: "A bug", body: "It broke" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://git.example.com/api/v1/repos/acme/web/issues");
  assertEquals(JSON.parse(calls[0].body!), { title: "A bug", body: "It broke" });
});

/** Gitea takes label IDS on write; names are a validation error, not a lookup. */
Deno.test("issue-create: labels must be numeric ids, and a name is caught locally", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }], conn);
  await action.execute!({ repo: "web", title: "x", labels: "3, 7" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).labels, [3, 7]);

  const bad = mockCtx([], conn);
  const err = await assertRejects(
    async () => await action.execute!({ repo: "web", title: "x", labels: "bug" }, bad.ctx),
    Error,
  );
  assert(err.message.includes("label ids, not names"), err.message);
  assertEquals(bad.calls.length, 0);
});

Deno.test("issue-create: a milestone of 0 means none and is not sent", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }], conn);
  await action.execute!({ repo: "web", title: "x", milestone: 0 }, ctx);
  assertEquals(JSON.parse(calls[0].body!).milestone, undefined);
});

Deno.test("issue-create: `owner/name` overrides the connection's owner", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }], conn);
  await action.execute!({ repo: "them/web", title: "x" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/v1/repos/them/web/issues");
});

Deno.test("issue-create: a title is required, before any request", async () => {
  const { ctx, calls } = mockCtx([], conn);
  await assertRejects(async () => await action.execute!({ repo: "web" }, ctx), Error, "`title`");
  assertEquals(calls.length, 0);
  assertEquals(action.idempotent, false);
});

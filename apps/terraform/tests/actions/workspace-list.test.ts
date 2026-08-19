import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/workspace-list.ts";

const page = {
  status: 200,
  body: {
    data: [
      { id: "ws-1", attributes: { name: "prod", "auto-apply": true, locked: false } },
      { id: "ws-2", attributes: { name: "staging", "auto-apply": false, locked: true } },
      { id: "ws-3", attributes: { name: "dev", "auto-apply": true, locked: true } },
    ],
    meta: { pagination: { "current-page": 1, "next-page": 2, "total-count": 41 } },
  },
};

Deno.test("workspace-list: lists an organisation's workspaces", async () => {
  const { ctx, calls } = mockCtx([page]);
  const result = await action.execute({ organization: "acme" }, ctx) as Record<string, unknown>;
  assertEquals(new URL(calls[0].url).pathname, "/api/v2/organizations/acme/workspaces");
  assertEquals(result.count, 3);
  assertEquals(result.ids, ["ws-1", "ws-2", "ws-3"]);
  assertEquals(result.totalCount, 41);
  assertEquals(result.nextPage, 2);
});

/**
 * The most useful thing to know before pointing an automation at an
 * organisation: which workspaces apply without asking anyone.
 */
Deno.test("workspace-list: counts the auto-apply and locked workspaces", async () => {
  const { ctx, logs } = mockCtx([page]);
  const result = await action.execute({ organization: "acme" }, ctx) as Record<string, unknown>;
  assertEquals(result.autoApplyCount, 2);
  assertEquals(result.lockedCount, 2);
  assertEquals(logs[0].data, { count: 3, autoApplyCount: 2, lockedCount: 2 });
});

Deno.test("workspace-list: search and tags are sent as the API's bracketed filters", async () => {
  const { ctx, calls } = mockCtx([page]);
  await action.execute(
    { organization: "acme", search: "prod", tags: "aws, eu", excludeTags: "legacy" },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("search[name]"), "prod");
  assertEquals(url.searchParams.get("search[tags]"), "aws,eu");
  assertEquals(url.searchParams.get("search[exclude-tags]"), "legacy");
});

/** All tags must match, so a long list usually returns nothing. */
Deno.test("workspace-list: the tag hint says the filter is an AND", () => {
  const tags = action.params!.find((p) => p.key === "tags")!;
  assert(/ALL of them must match/.test(tags.hint!), tags.hint);
});

Deno.test("workspace-list: unset filters are not sent as empty parameters", async () => {
  const { ctx, calls } = mockCtx([page]);
  await action.execute({ organization: "acme", search: "", tags: "" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("search[name]"), null);
  assertEquals(url.searchParams.get("search[tags]"), null);
});

Deno.test("workspace-list: an organisation is required", async () => {
  const { ctx, calls } = mockCtx([]);
  let message = "";
  try {
    await action.execute({}, ctx);
  } catch (err) {
    message = String(err);
  }
  assert(/`organization` is required/.test(message), message);
  assertEquals(calls.length, 0);
});

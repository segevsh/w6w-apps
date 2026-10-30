import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/workflow-list.ts";

test("workflow-list: GETs /workflows with name and cursor", async () => {
  const { ctx, calls } = mockCtx([{
    body: { workflows: [{ id: "w1", name: "Onboarding" }] },
    headers: {
      "content-type": "application/json",
    },
  }]);
  const out = await action.execute({ name: "Onboard", cursor: "abc" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v1.1/workflows");
  assertEquals(url.searchParams.get("name"), "Onboard");
  assertEquals(url.searchParams.get("_"), "abc");
  assertEquals(out.workflows, [{ id: "w1", name: "Onboarding" }]);
});

test("workflow-list: extracts nextCursor from the 'next' link", async () => {
  const { ctx } = mockCtx([{
    body: {
      workflows: [],
      links: [{
        name: "next",
        href: "https://public-api.process.st/api/v1.1/workflows?_=next-token",
        type: "Api",
      }],
    },
  }]);
  const out = await action.execute({}, ctx);
  assertEquals(out.nextCursor, "next-token");
});

test("workflow-list: no next link means no next cursor", async () => {
  const { ctx } = mockCtx([{ body: { workflows: [] } }]);
  const out = await action.execute({}, ctx);
  assertEquals(out.nextCursor, undefined);
});

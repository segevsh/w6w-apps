import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/posting-list.ts";

const D = { display: { environment: "production" } };
const postings = {
  status: 200,
  body: {
    data: [
      { id: "p1", text: "Engineer", state: "published", categories: { team: "Engineering" } },
      { id: "p2", text: "Quiet role", state: "internal", categories: { team: "Engineering" } },
      { id: "p3", text: "Old role", state: "closed", categories: { team: "Sales" } },
      { id: "p4", text: "Idea", state: "draft" },
    ],
    hasNext: false,
  },
};

/** Both published and internal are open roles. */
Deno.test("posting-list: counts open roles as published plus internal", async () => {
  const { ctx } = mockCtx([postings], D);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(result.openRoles, ["Engineer", "Quiet role"]);
  assertEquals(result.byState, { published: 1, internal: 1, closed: 1, draft: 1 });
});

/** Postings have the same confidentiality default as opportunities. */
Deno.test("posting-list: defaults confidentiality to all", async () => {
  const { ctx, calls } = mockCtx([postings], D);
  await action.execute({}, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("confidentiality"), "all");
});

/** `include` is exclusive, so it is only ever sent deliberately. */
Deno.test("posting-list: only sends include when the description is wanted", async () => {
  const without = mockCtx([postings], D);
  await action.execute({}, without.ctx);
  assertEquals(new URL(without.calls[0].url).searchParams.get("include"), null);

  const withContent = mockCtx([postings], D);
  await action.execute({ includeContent: true }, withContent.ctx);
  assertEquals(new URL(withContent.calls[0].url).searchParams.get("include"), "content");
});

Deno.test("posting-list: the filters reach the query", async () => {
  const { ctx, calls } = mockCtx([postings], D);
  await action.execute({ state: "published", team: "Engineering", location: "London" }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("state"), "published");
  assertEquals(q.get("team"), "Engineering");
  assertEquals(q.get("location"), "London");
});

Deno.test("posting-list: reports the distinct teams hiring", async () => {
  const { ctx } = mockCtx([postings], D);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(result.teams, ["Engineering", "Sales"]);
});

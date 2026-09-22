import { assert, assertEquals } from "@std/assert";
import conversationList from "../../actions/conversation-list.ts";
import { mockRelevanceCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("conversation-list: GETs /agents/conversations/list with page, size and search", async () => {
  const { ctx, calls } = mockRelevanceCtx([
    {
      body: {
        results: [{ conversation_id: "c1" }],
        agents: { a1: { title: "Triage" } },
        evals: { e1: { score: 1 } },
        costs: { c1: 0.4 },
      },
    },
  ]);
  const out = await conversationList.execute({ query: "triage", page: 3, pageSize: 50 }, ctx) as {
    results: unknown[];
    agents?: Record<string, unknown>;
    costs?: Record<string, unknown>;
  };

  assertEquals(pathOf(calls[0].url), "/latest/agents/conversations/list");
  assertEquals(calls[0].method, "GET");
  assertEquals(queryOf(calls[0].url), { query: "triage", page: "3", page_size: "50" });
  // All four lookups the vendor returns alongside the rows are passed through.
  assertEquals(out.results.length, 1);
  assert(out.agents?.a1);
  assertEquals(out.costs?.c1, 0.4);
});

Deno.test("conversation-list: sends no query at all when none is supplied", async () => {
  const { ctx, calls } = mockRelevanceCtx([{ body: { results: [] } }]);
  await conversationList.execute({}, ctx);
  assertEquals(queryOf(calls[0].url), {});
});

Deno.test("conversation-list: exposes the three common params and no debug toggles", () => {
  assertEquals(conversationList.params?.map((p) => p.key), ["query", "page", "pageSize"]);
  assertEquals(conversationList.type, "read");
  assertEquals(conversationList.resource, "conversation");
});

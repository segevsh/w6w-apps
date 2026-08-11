import { assertEquals } from "@std/assert";
import action from "../../actions/member-search.ts";
import { bodyOf, listEnvelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("member-search: POSTs filter, search and return into one body", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([{ id: "m-1" }]) }]);
  const filter = { fields: { email: ["a@example.com", "b@example.com"] } };
  const out = await action.execute({
    filter,
    query: "jane",
    returnOptions: { includeDisabled: true },
    pageCursor: "cur",
  }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v2/members/search");
  assertEquals(bodyOf(calls[0]), {
    data: {
      filter,
      search: { query: "jane" },
      return: { includeDisabled: true },
    },
  });
  assertEquals(queryOf(calls[0].url), { pageCursor: "cur" });
  assertEquals(out.items.length, 1);
});

Deno.test("member-search: unset keys are omitted rather than sent as null", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([]) }]);
  await action.execute({ query: "jane" }, ctx);
  assertEquals(bodyOf(calls[0]), { data: { search: { query: "jane" } } });
});

import { assertEquals } from "@std/assert";
import action from "../../actions/list-domains.ts";
import { exec, mockCtx, page, pathOf, queryOf } from "../_helpers.ts";

Deno.test("list-domains: GETs /v1/domains and invents no query defaults", async () => {
  const body = page([{ id: "1jreeo", name: "example.org" }]);
  const { ctx, calls } = mockCtx([{ body }]);
  const out = await exec(action, {}, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/domains");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(out, body);
});

Deno.test("list-domains: forwards page, limit and verified (including false)", async () => {
  const { ctx, calls } = mockCtx([{ body: page([]) }]);
  await exec(action, { page: 2, limit: 50, verified: false }, ctx);
  assertEquals(queryOf(calls[0].url), { page: "2", limit: "50", verified: "false" });
});

Deno.test("list-domains: is a search with limit bounded 10..100", () => {
  assertEquals(action.type, "search");
  assertEquals(action.params!.find((p) => p.key === "limit")?.validation, {
    min: 10,
    max: 100,
    integer: true,
  });
});

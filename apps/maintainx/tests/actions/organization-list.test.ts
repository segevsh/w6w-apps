import { assertEquals } from "@std/assert";
import organizationList from "../../actions/organization-list.ts";
import { mockCtx, pathOf, queryAll } from "../_helpers.ts";

Deno.test("organization-list: GET /v1/organizations with paging, returns { organizations, nextCursor }", async () => {
  const { ctx, calls } = mockCtx([{
    body: { organizations: [{ id: 1, name: "n" }], nextCursor: "c", nextPageUrl: "u" },
  }]);
  const out = await organizationList.execute({ limit: 25, cursor: "p1", organizationId: 2 }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/organizations");
  assertEquals(queryAll(calls[0].url), { limit: ["25"], cursor: ["p1"] });
  assertEquals(calls[0].headers["x-organization-id"], "2");
  assertEquals(out, { organizations: [{ id: 1, name: "n" }], nextCursor: "c" });
});

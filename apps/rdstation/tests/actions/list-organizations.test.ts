import { assertEquals } from "@std/assert";

import listOrganizations from "../../actions/list-organizations.ts";
import { API_ROOT, envelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("list-organizations: GET /organizations with the documented filter names", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope("organizations", []) }]);

  await listOrganizations.execute(
    {
      page: 3,
      limit: 10,
      order: "name",
      direction: "asc",
      q: "Acme",
      organizationSegment: "SaaS",
      userId: "u1",
    },
    ctx,
  );

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v1/organizations");
  assertEquals(queryOf(calls[0].url), {
    page: "3",
    limit: "10",
    order: "name",
    direction: "asc",
    q: "Acme",
    organization_segment: "SaaS",
    user_id: "u1",
  });
});

Deno.test("list-organizations: returns the vendor's envelope verbatim", async () => {
  const payload = { organizations: [{ _id: "o1" }], has_more: false, total: 1 };
  const { ctx } = mockCtx([{ body: payload }]);

  assertEquals(await listOrganizations.execute({}, ctx), payload);
});

Deno.test("list-organizations: an unset optional filter is omitted", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope("organizations", []) }]);

  await listOrganizations.execute({ page: 1 }, ctx);

  assertEquals(queryOf(calls[0].url), { page: "1" });
  assertEquals(calls[0].url.startsWith(API_ROOT), true);
  assertEquals(listOrganizations.type, "search");
});

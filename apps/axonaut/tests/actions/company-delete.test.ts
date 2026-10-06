import { assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import companyDelete from "../../actions/company-delete.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = { "companyId": 42 };

Deno.test("company-delete: DELETE /api/v2/companies/42 with the documented query, header and body", async () => {
  const { ctx, calls } = mockCtx([{ status: 202, body: undefined }]);
  const out = await companyDelete.execute(INPUT as never, ctx);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/api/v2/companies/42");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].headers["page"], undefined);
  assertEquals(calls[0].body, null);
  assertEquals(
    calls[0].headers["userapikey"],
    undefined,
    "credentials belong to sign, not the action",
  );
  assertEquals(out, { ok: true });
});

Deno.test("company-delete: an Axonaut error surfaces its message and status", async () => {
  const { ctx } = mockCtx([{ status: 403, body: errorBody(403, "Forbidden access") }]);
  const err = await assertRejects(async () => await companyDelete.execute(INPUT as never, ctx));
  assertStringIncludes((err as Error).message, "Axonaut 403: Forbidden access");
});

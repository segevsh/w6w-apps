// deno-lint-ignore-file no-explicit-any
import { assertEquals, assertRejects } from "@std/assert";
import contactUpdate from "../../actions/contact-update.ts";
import { jsonBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("contact-update: PATCH /contacts/u-1", async () => {
  const { ctx, calls } = mockCtx([{ status: 204, body: undefined }]);
  const out = await contactUpdate.execute({
    "contact_id": "u-1",
    "phone": "123",
  } as any, ctx) as Record<string, any>;
  const items = (out.items ?? []) as Array<Record<string, any>>;
  void items;
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(pathOf(calls[0].url), "/contacts/u-1");
  assertEquals(calls[0].url.startsWith("https://api.tidio.com/"), true);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(jsonBody(calls[0]), {
    "phone": "123",
  });
  assertEquals(calls[0].headers.accept, "application/json; version=1");
  assertEquals(calls[0].headers["x-tidio-openapi-client-id"], undefined);
  assertEquals(out.updated, true);
  assertEquals(out.id, "u-1");
});

Deno.test("contact-update: a vendor error surfaces its code and message", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { errors: [{ code: "not_found", message: "Nope" }] },
  }]);
  const err = await assertRejects(async () =>
    await contactUpdate.execute({
      "contact_id": "u-1",
      "phone": "123",
    } as any, ctx)
  ) as Error;
  assertEquals(err.message.includes("(404)"), true);
  assertEquals(err.message.includes("not_found: Nope"), true);
});

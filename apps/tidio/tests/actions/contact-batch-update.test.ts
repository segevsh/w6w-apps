// deno-lint-ignore-file no-explicit-any
import { assertEquals, assertRejects } from "@std/assert";
import contactBatchUpdate from "../../actions/contact-batch-update.ts";
import { jsonBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("contact-batch-update: PATCH /contacts/batch", async () => {
  const { ctx, calls } = mockCtx([{ status: 204, body: undefined }]);
  const out = await contactBatchUpdate.execute({
    "contacts": [
      {
        "id": "u-1",
        "first_name": "Ann",
      },
    ],
  } as any, ctx) as Record<string, any>;
  const items = (out.items ?? []) as Array<Record<string, any>>;
  void items;
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(pathOf(calls[0].url), "/contacts/batch");
  assertEquals(calls[0].url.startsWith("https://api.tidio.com/"), true);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(jsonBody(calls[0]), {
    "contacts": [
      {
        "id": "u-1",
        "first_name": "Ann",
      },
    ],
  });
  assertEquals(calls[0].headers.accept, "application/json; version=1");
  assertEquals(calls[0].headers["x-tidio-openapi-client-id"], undefined);
  assertEquals(out.updated, true);
  assertEquals(out.count, 1);
});

Deno.test("contact-batch-update: a vendor error surfaces its code and message", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { errors: [{ code: "not_found", message: "Nope" }] },
  }]);
  const err = await assertRejects(async () =>
    await contactBatchUpdate.execute({
      "contacts": [
        {
          "id": "u-1",
          "first_name": "Ann",
        },
      ],
    } as any, ctx)
  ) as Error;
  assertEquals(err.message.includes("(404)"), true);
  assertEquals(err.message.includes("not_found: Nope"), true);
});

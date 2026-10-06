// deno-lint-ignore-file no-explicit-any
import { assertEquals, assertRejects } from "@std/assert";
import contactBatchCreate from "../../actions/contact-batch-create.ts";
import { jsonBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("contact-batch-create: POST /contacts/batch", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: {
      "contacts": [
        {
          "id": "u-1",
          "email": "a@b.co",
          "messenger_id": null,
          "instagram_id": null,
        },
      ],
    },
  }]);
  const out = await contactBatchCreate.execute({
    "contacts": [
      {
        "distinct_id": "d1",
        "email": "a@b.co",
      },
    ],
  } as any, ctx) as Record<string, any>;
  const items = (out.items ?? []) as Array<Record<string, any>>;
  void items;
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/contacts/batch");
  assertEquals(calls[0].url.startsWith("https://api.tidio.com/"), true);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(jsonBody(calls[0]), {
    "contacts": [
      {
        "distinct_id": "d1",
        "email": "a@b.co",
      },
    ],
  });
  assertEquals(calls[0].headers.accept, "application/json; version=1");
  assertEquals(calls[0].headers["x-tidio-openapi-client-id"], undefined);
  assertEquals(out.count, 1);
});

Deno.test("contact-batch-create: a vendor error surfaces its code and message", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { errors: [{ code: "not_found", message: "Nope" }] },
  }]);
  const err = await assertRejects(async () =>
    await contactBatchCreate.execute({
      "contacts": [
        {
          "distinct_id": "d1",
          "email": "a@b.co",
        },
      ],
    } as any, ctx)
  ) as Error;
  assertEquals(err.message.includes("(404)"), true);
  assertEquals(err.message.includes("not_found: Nope"), true);
});

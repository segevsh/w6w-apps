// deno-lint-ignore-file no-explicit-any
import { assertEquals, assertRejects } from "@std/assert";
import contactCreate from "../../actions/contact-create.ts";
import { jsonBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("contact-create: POST /contacts", async () => {
  const { ctx, calls } = mockCtx([{
    status: 201,
    body: {
      "id": "u-9",
    },
  }]);
  const out = await contactCreate.execute({
    "distinct_id": "d1",
    "email": "a@b.co",
    "properties": {
      "plan": "pro",
    },
  } as any, ctx) as Record<string, any>;
  const items = (out.items ?? []) as Array<Record<string, any>>;
  void items;
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/contacts");
  assertEquals(calls[0].url.startsWith("https://api.tidio.com/"), true);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(jsonBody(calls[0]), {
    "distinct_id": "d1",
    "email": "a@b.co",
    "properties": [
      {
        "name": "plan",
        "value": "pro",
      },
    ],
  });
  assertEquals(calls[0].headers.accept, "application/json; version=1");
  assertEquals(calls[0].headers["x-tidio-openapi-client-id"], undefined);
  assertEquals(out.id, "u-9");
});

Deno.test("contact-create: a vendor error surfaces its code and message", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { errors: [{ code: "not_found", message: "Nope" }] },
  }]);
  const err = await assertRejects(async () =>
    await contactCreate.execute({
      "distinct_id": "d1",
      "email": "a@b.co",
      "properties": {
        "plan": "pro",
      },
    } as any, ctx)
  ) as Error;
  assertEquals(err.message.includes("(404)"), true);
  assertEquals(err.message.includes("not_found: Nope"), true);
});

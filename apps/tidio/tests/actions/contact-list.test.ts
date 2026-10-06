// deno-lint-ignore-file no-explicit-any
import { assertEquals, assertRejects } from "@std/assert";
import contactList from "../../actions/contact-list.ts";
import { jsonBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("contact-list: GET /contacts", async () => {
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
      "meta": {
        "cursor": "c2",
        "limit": 100,
      },
    },
  }]);
  const out = await contactList.execute({
    "email": "a@b.co",
    "cursor": "c1",
  } as any, ctx) as Record<string, any>;
  const items = (out.items ?? []) as Array<Record<string, any>>;
  void items;
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/contacts");
  assertEquals(calls[0].url.startsWith("https://api.tidio.com/"), true);
  assertEquals(queryOf(calls[0].url), {
    "email": "a@b.co",
    "cursor": "c1",
  });
  assertEquals(jsonBody(calls[0]), null);
  assertEquals(calls[0].headers.accept, "application/json; version=1");
  assertEquals(calls[0].headers["x-tidio-openapi-client-id"], undefined);
  assertEquals(out.count, 1);
  assertEquals(out.nextCursor, "c2");
  assertEquals(out.hasMore, true);
  assertEquals("messenger_id" in items[0], false);
  assertEquals(items[0].id, "u-1");
});

Deno.test("contact-list: a vendor error surfaces its code and message", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { errors: [{ code: "not_found", message: "Nope" }] },
  }]);
  const err = await assertRejects(async () =>
    await contactList.execute({
      "email": "a@b.co",
      "cursor": "c1",
    } as any, ctx)
  ) as Error;
  assertEquals(err.message.includes("(404)"), true);
  assertEquals(err.message.includes("not_found: Nope"), true);
});

import { assertEquals } from "@std/assert";
import { API, mockCtx } from "../_helpers.ts";
import contactAttributeCreate from "../../actions/contact-attribute-create.ts";

Deno.test("contact-attribute-create: sends every documented field in its documented place", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: { uid: "r1" }, metadata: { nextCursor: "c2" } },
  }]);
  const result = await contactAttributeCreate.execute(
    {
      "label": "label-1",
      "dataType": "ADDRESS",
      "ownerResourceType": "PRODUCT",
      "isEncrypted": true,
    } as never,
    ctx,
  );
  const call = calls[0];
  const url = new URL(call.url);
  assertEquals(call.method, "POST");
  assertEquals(url.origin + url.pathname, API + "/contact_attributes");
  assertEquals([...url.searchParams.keys()].length, 0);
  assertEquals(JSON.parse(call.body ?? "null"), {
    "label": "label-1",
    "dataType": "ADDRESS",
    "ownerResourceType": "PRODUCT",
    "isEncrypted": true,
  });
  assertEquals(call.headers["content-type"], "application/json");
  assertEquals(result, { uid: "r1" });
});

Deno.test("contact-attribute-create: a minimal call sends only what was set", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: { uid: "r1" }, metadata: { nextCursor: "c2" } },
  }]);
  const result = await contactAttributeCreate.execute(
    { "label": "label-1", "dataType": "ADDRESS", "ownerResourceType": "PRODUCT" } as never,
    ctx,
  );
  const call = calls[0];
  const url = new URL(call.url);
  assertEquals(call.method, "POST");
  assertEquals(url.origin + url.pathname, API + "/contact_attributes");
  assertEquals([...url.searchParams.keys()].length, 0);
  assertEquals(JSON.parse(call.body ?? "null"), {
    "label": "label-1",
    "dataType": "ADDRESS",
    "ownerResourceType": "PRODUCT",
  });
  assertEquals(call.headers["content-type"], "application/json");
  assertEquals(result, { uid: "r1" });
});

Deno.test("contact-attribute-create: declares its params and kind", () => {
  assertEquals((contactAttributeCreate.params ?? []).map((p) => p.key), [
    "label",
    "dataType",
    "ownerResourceType",
    "isEncrypted",
  ]);
  assertEquals((contactAttributeCreate.params ?? []).filter((p) => p.required).map((p) => p.key), [
    "label",
    "dataType",
    "ownerResourceType",
  ]);
  assertEquals(contactAttributeCreate.type, "perform");
  assertEquals(contactAttributeCreate.idempotent, false);
});

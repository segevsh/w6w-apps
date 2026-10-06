import { assertEquals, assertRejects } from "@std/assert";
import usZipLookup from "../../actions/us-zip-lookup.ts";
import { bodyOf, errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("us-zip-lookup: POSTs the zip and returns the cities", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      id: "us_zip_1",
      zip_code: "94107",
      zip_code_type: "standard",
      cities: [{ city: "SAN FRANCISCO", state: "CA", preferred: true }],
    },
  }]);
  const out = await usZipLookup.execute({ zipCode: "94107" }, ctx) as { cities: unknown[] };
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/us_zip_lookups");
  assertEquals(bodyOf(calls[0]), { zip_code: "94107" });
  assertEquals(out.cities.length, 1);
});

Deno.test("us-zip-lookup: a malformed zip surfaces Lob's validation code", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    body: errorBody("invalid", "zip_code is invalid", 422),
  }]);
  await assertRejects(
    async () => await usZipLookup.execute({ zipCode: "abc" }, ctx),
    Error,
    "invalid",
  );
});

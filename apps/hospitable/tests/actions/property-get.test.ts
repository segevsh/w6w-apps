import { assert, assertEquals } from "@std/assert";
import propertyGet from "../../actions/property-get.ts";
import { mockCtx } from "../_helpers.ts";

const requiredOf = (a: { params?: Array<{ key: string; required?: boolean }> }) =>
  (a.params ?? []).filter((p) => p.required).map((p) => p.key).sort();

Deno.test("property-get: GET /v2/properties/{uuid}, id is path-encoded", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { id: "p/1" } } }]);
  await propertyGet.execute({ uuid: "p/1", include: "listings" }, ctx);
  assertEquals(
    calls[0].url,
    "https://public.api.hospitable.com/v2/properties/p%2F1?include=listings",
  );
  assertEquals(requiredOf(propertyGet), ["uuid"]);
});

Deno.test("account/property actions: a vendor error surfaces as a thrown message", async () => {
  const { ctx } = mockCtx([{ status: 404, body: { message: "No query results for model" } }]);
  let message = "";
  try {
    await propertyGet.execute({ uuid: "nope" }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assert(message.includes("404") && message.includes("No query results"), message);
});

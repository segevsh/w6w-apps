import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-location.ts";

Deno.test("get-location: GETs /v1/locations/{id} with the default readMask", async () => {
  const body = { name: "locations/1", title: "Acme Coffee" };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!({ locationId: "1" }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v1/locations/1");
  assertEquals(
    url.searchParams.get("readMask"),
    "name,title,storefrontAddress,phoneNumbers,websiteUri,regularHours,latlng,openInfo,profile,categories,metadata",
  );
  assertEquals(result, body);
});

Deno.test("get-location: honors a caller-supplied readMask", async () => {
  const { ctx, calls } = mockCtx([{ body: { name: "locations/1" } }]);
  await action.execute!({ locationId: "1", readMask: "name" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("readMask"), "name");
});

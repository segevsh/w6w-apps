import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/update-location.ts";

Deno.test("update-location: PATCHes /v1/locations/{id} and derives updateMask from supplied fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { name: "locations/1", title: "New name" } }]);
  const result = await action.execute!({ locationId: "1", title: "New name" }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(url.pathname, "/v1/locations/1");
  assertEquals(url.searchParams.get("updateMask"), "title");
  assertEquals(JSON.parse(calls[0].body!), { title: "New name" });
  assertEquals(result, { name: "locations/1", title: "New name" });
});

Deno.test("update-location: builds nested phoneNumbers/storefrontAddress/profile/openInfo/latlng bodies", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({
    locationId: "1",
    primaryPhone: "+1 555-0100",
    addressRegionCode: "US",
    addressLocality: "Springfield",
    addressAdministrativeArea: "IL",
    addressPostalCode: "62701",
    addressLines: ["123 Main St"],
    description: "A cozy coffee shop.",
    latitude: 39.78,
    longitude: -89.65,
    openStatus: "OPEN",
  }, ctx);

  const body = JSON.parse(calls[0].body!);
  assertEquals(body.phoneNumbers, { primaryPhone: "+1 555-0100" });
  assertEquals(body.storefrontAddress, {
    regionCode: "US",
    locality: "Springfield",
    administrativeArea: "IL",
    postalCode: "62701",
    addressLines: ["123 Main St"],
  });
  assertEquals(body.profile, { description: "A cozy coffee shop." });
  assertEquals(body.latlng, { latitude: 39.78, longitude: -89.65 });
  assertEquals(body.openInfo, { status: "OPEN" });

  const mask = new URL(calls[0].url).searchParams.get("updateMask")!.split(",");
  for (const field of ["phoneNumbers", "storefrontAddress", "profile", "latlng", "openInfo"]) {
    assert(mask.includes(field), `updateMask missing ${field}`);
  }
});

Deno.test("update-location: an untouched field is neither in the body nor the mask", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ locationId: "1", title: "Only this" }, ctx);
  const body = JSON.parse(calls[0].body!);
  assert(!("websiteUri" in body));
  assert(!("storeCode" in body));
  assertEquals(new URL(calls[0].url).searchParams.get("updateMask"), "title");
});

Deno.test("update-location: forwards validateOnly", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ locationId: "1", title: "x", validateOnly: true }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("validateOnly"), "true");
});

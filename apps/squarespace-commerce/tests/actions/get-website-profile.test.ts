import { assertEquals } from "@std/assert";
import getWebsiteProfile from "../../actions/get-website-profile.ts";
import { API_ROOT, errorBody, mockCtx, pathOf } from "../_helpers.ts";

const PROFILE = {
  id: "5e4a1b2c3d4e5f60718293a4",
  title: "My Store",
  url: "https://my-store.squarespace.com",
  currency: "USD",
  language: "en-US",
  timeZone: "America/New_York",
  location: { country: "US", region: "NY" },
  measurementStandard: "IMPERIAL",
  siteId: "6a1b2c3d4e5f60718293a4b5",
};

Deno.test("get-website-profile: GET /1.0/authorization/website", async () => {
  const { ctx, calls } = mockCtx([{ body: PROFILE }]);
  const out = await getWebsiteProfile.execute!({}, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, `${API_ROOT}/1.0/authorization/website`);
  assertEquals(out.id, PROFILE.id);
  assertEquals(out.measurementStandard, "IMPERIAL");
  assertEquals(out.location, { country: "US", region: "NY" });
});

Deno.test("get-website-profile: sends the required User-Agent and no credential", async () => {
  const { ctx, calls } = mockCtx([{ body: PROFILE }]);
  await getWebsiteProfile.execute!({}, ctx);

  assertEquals(calls[0].headers["user-agent"], "w6w-squarespace-commerce/1.0");
  // Only `sign` may carry the credential — never a client or an action.
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(calls[0].body, null);
});

Deno.test("get-website-profile: surfaces the vendor error envelope verbatim", async () => {
  const { ctx } = mockCtx([{
    status: 403,
    body: errorBody("AUTHORIZATION_ERROR", {
      message: "You are not authorized to do that.",
      contextId: "01JCONTEXT",
    }),
  }]);

  let message = "";
  try {
    await getWebsiteProfile.execute!({}, ctx);
  } catch (err) {
    message = (err as Error).message;
  }
  assertEquals(message.includes("Squarespace 403 AUTHORIZATION_ERROR"), true);
  assertEquals(message.includes("GET /1.0/authorization/website"), true);
  assertEquals(message.includes("You are not authorized to do that."), true);
  assertEquals(message.includes("contextId 01JCONTEXT"), true);
});

Deno.test("get-website-profile: a 404 with a subtype names both codes", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: errorBody("INVALID_REQUEST_ERROR", {
      subtype: "INVENTORY_ITEM_NOT_FOUND",
      message: "not found",
    }),
  }]);

  let message = "";
  try {
    await getWebsiteProfile.execute!({}, ctx);
  } catch (err) {
    message = (err as Error).message;
  }
  assertEquals(message.includes("INVALID_REQUEST_ERROR/INVENTORY_ITEM_NOT_FOUND"), true);
  assertEquals(pathOf(`${API_ROOT}/1.0/authorization/website`), "/1.0/authorization/website");
});

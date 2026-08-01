import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/business-profile-get.ts";

Deno.test("business-profile-get: GETs the business profile with the standard field set", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [{ about: "We sell widgets." }] } }]);
  const out = await action.execute({}, ctx);
  assertEquals(out, { data: [{ about: "We sell widgets." }] });
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v23.0/1234567890/whatsapp_business_profile");
  assertEquals(
    url.searchParams.get("fields"),
    "about,address,description,email,profile_picture_url,websites,vertical",
  );
});

Deno.test("business-profile-get: is a read action safe to invoke with {}", () => {
  assertEquals(action.type, "read");
  assertEquals(action.params?.length, 0);
});

import { assertEquals } from "@std/assert";
import getProfiles from "../../actions/get-profiles.ts";
import { API_ROOT, errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("get-profiles: GET /1.0/profiles/{profileIdCsvs} with no enforced 50-id cap", async () => {
  const { ctx, calls } = mockCtx([{ body: { profiles: [{ id: "PR1" }] } }]);
  const ids = Array.from({ length: 60 }, (_, i) => `PR${i}`).join(",");
  const out = await getProfiles.execute!({ profileIds: ids }, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url).startsWith("/1.0/profiles/PR0,PR1"), true);
  assertEquals(out.profiles?.[0].id, "PR1");
  assertEquals(calls[0].url.startsWith(API_ROOT), true);
});

Deno.test("get-profiles: an empty id list is refused before the request", () => {
  const { ctx } = mockCtx([]);
  let message = "";
  try {
    getProfiles.execute!({ profileIds: "" }, ctx);
  } catch (err) {
    message = (err as Error).message;
  }
  assertEquals(message.includes("at least one id"), true);
});

Deno.test("get-profiles: a vendor 400 is surfaced verbatim", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: errorBody("INVALID_REQUEST_ERROR", { subtype: "INVALID_ARGUMENT", message: "bad ids" }),
  }]);

  let message = "";
  try {
    await getProfiles.execute!({ profileIds: "x" }, ctx);
  } catch (err) {
    message = (err as Error).message;
  }
  assertEquals(message.includes("400 INVALID_REQUEST_ERROR/INVALID_ARGUMENT"), true);
});

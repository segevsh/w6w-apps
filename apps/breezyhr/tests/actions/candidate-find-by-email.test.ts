import { assertEquals } from "@std/assert";
import action from "../../actions/candidate-find-by-email.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("candidate-find-by-email: encodes the email and returns the array as sent", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ _id: "k1", position: { _id: "p1" } }] }]);
  const out = await action.execute!({ companyId: "c1", emailAddress: "a+b@x.com" }, ctx);
  assertEquals(
    calls[0].url,
    "https://api.breezy.hr/v3/company/c1/candidates/search?email_address=a%2Bb%40x.com",
  );
  assertEquals(calls[0].method, "GET");
  assertEquals(out, { candidates: [{ _id: "k1", position: { _id: "p1" } }] });
});

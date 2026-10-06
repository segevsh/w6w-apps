import { assertEquals } from "@std/assert";
import action from "../../actions/candidate-update.ts";
import { mockCtx } from "../_helpers.ts";

const base = { companyId: "c1", positionId: "p1", candidateId: "k1" };

Deno.test("candidate-update: PUTs only the provided fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { _id: "k1", headline: "Hi" } }]);
  const out = await action.execute!({ ...base, headline: "Hi", phoneNumber: "1" }, ctx);
  assertEquals(calls[0].url, "https://api.breezy.hr/v3/company/c1/position/p1/candidate/k1");
  assertEquals(calls[0].method, "PUT");
  assertEquals(JSON.parse(calls[0].body!), { headline: "Hi", phone_number: "1" });
  assertEquals(out, { _id: "k1", headline: "Hi" });
});

Deno.test("candidate-update: empty tags clear and social profiles parse", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!(
    { ...base, tags: [], socialProfiles: '{"linkedin":"https://l.in/x"}' },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!), {
    tags: [],
    social_profiles: { linkedin: "https://l.in/x" },
  });
});

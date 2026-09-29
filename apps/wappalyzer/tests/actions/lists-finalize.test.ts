import { assertEquals } from "@std/assert";
import listsFinalize from "../../actions/lists-finalize.ts";
import { mockCtx, pathOf, withCredits } from "../_helpers.ts";

Deno.test("lists-finalize: POSTs { spendCredits } to /v2/lists/{id}, no trailing slash", async () => {
  const { ctx, calls } = mockCtx([
    withCredits(
      { id: "lst_abcdef", status: "Complete", url: "https://lists.wappalyzer.com/x.zip" },
      1000,
      99000,
    ),
  ]);
  const out = await listsFinalize.execute({ id: "lst_abcdef", spendCredits: 1000 }, ctx) as {
    id: string;
    status: string;
    url: string;
    creditsSpent: number;
    creditsRemaining: number;
  };

  assertEquals(pathOf(calls[0].url), "/v2/lists/lst_abcdef");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { spendCredits: 1000 });
  assertEquals(out.status, "Complete");
  assertEquals(out.url, "https://lists.wappalyzer.com/x.zip");
  assertEquals(out.creditsSpent, 1000);
  assertEquals(out.creditsRemaining, 99000);
});

Deno.test("lists-finalize: spendCredits and id are both required", () => {
  const spend = listsFinalize.params?.find((p) => p.key === "spendCredits");
  const id = listsFinalize.params?.find((p) => p.key === "id");
  assertEquals(spend?.required, true);
  assertEquals(id?.required, true);
});

/**
 * Retrying a purchase against a list that may already be `Complete` is a
 * billing operation, not a safe-to-repeat read — this must stay explicit.
 */
Deno.test("lists-finalize: is marked not idempotent", () => {
  assertEquals(listsFinalize.idempotent, false);
});

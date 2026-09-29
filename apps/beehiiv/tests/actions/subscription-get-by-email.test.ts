import { assertEquals } from "@std/assert";
import subscriptionGetByEmail from "../../actions/subscription-get-by-email.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("subscription-get-by-email: fetches GET /publications/:id/subscriptions/by_email/:email", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: { id: "sub_1", email: "a@b.com", status: "active" } },
  }]);

  const out = await subscriptionGetByEmail.execute({
    publicationId: "pub_1",
    email: "a@b.com",
    expand: "tags",
  }, ctx) as { email: string };

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/publications/pub_1/subscriptions/by_email/a%40b.com");
  assertEquals(url.searchParams.getAll("expand[]"), ["tags"]);
  assertEquals(out.email, "a@b.com");
});

Deno.test("subscription-get-by-email: is a read action requiring email", () => {
  assertEquals(subscriptionGetByEmail.type, "read");
  const email = subscriptionGetByEmail.params?.find((p) => p.key === "email");
  assertEquals(email?.required, true);
});

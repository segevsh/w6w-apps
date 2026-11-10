import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-identity.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const raw = (name: string) => ({
  IdentityName: name,
  IdentityType: "DOMAIN",
  SendingEnabled: true,
  VerificationStatus: "SUCCESS",
});
const item = (name: string) => ({
  identityName: name,
  identityType: "DOMAIN",
  sendingEnabled: true,
  verificationStatus: "SUCCESS",
});
const ctx = (...names: string[]) => mockCtx([{ body: { EmailIdentities: names.map(raw) } }]);

test("new-identity seeds, emits only the new identity, and retries identically", async () => {
  const seed = ctx("a.com");
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(
    seed.calls[0].url,
    "https://email.us-east-1.amazonaws.com/v2/email/identities?PageSize=1000",
  );
  const first = await trigger.poll!(
    { ...input, state: seeded.nextState },
    ctx("a.com", "b.com").ctx,
  );
  const retry = await trigger.poll!(
    { ...input, state: seeded.nextState },
    ctx("a.com", "b.com").ctx,
  );
  assertEquals(first.events, [item("b.com")]);
  assertEquals(retry, first);
});

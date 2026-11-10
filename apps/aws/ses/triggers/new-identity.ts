import identityList from "../actions/identity-list.ts";
import { snapshotTrigger } from "../lib/triggers.ts";

export default snapshotTrigger({
  key: "new-identity",
  title: "New Sending Identity",
  description: "The run gets each email address or domain newly registered as a sending identity.",
  output: [
    { key: "identityName", type: "string", label: "Identity (address or domain)" },
    { key: "identityType", type: "string", label: "Type" },
    { key: "sendingEnabled", type: "boolean", label: "Sending enabled" },
    { key: "verificationStatus", type: "string", label: "Verification status" },
  ],
  sample: {
    identityName: "example.com",
    identityType: "DOMAIN",
    sendingEnabled: true,
    verificationStatus: "SUCCESS",
  },
  async list(ctx, pageSize, nextToken) {
    const res = await identityList.execute({ pageSize, nextToken }, ctx) as {
      identities?: unknown[];
      nextToken?: string;
    };
    return { items: res.identities ?? [], nextToken: res.nextToken };
  },
  keyOf: (item) => String((item as { identityName?: unknown }).identityName ?? ""),
});

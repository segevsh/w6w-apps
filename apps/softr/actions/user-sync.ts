import type { ActionDefinition } from "@w6w/types";
import { StudioClient, toList } from "../lib/client.ts";
import { domainParam } from "../lib/params.ts";

/**
 * `POST /v1/api/users/sync` — sync one user, a group of users, or (with the
 * emails list left empty) every user of a published Softr app.
 *
 * Softr's body shape here is a bare JSON array of emails, not an object — the
 * one endpoint on this host that isn't `{ ... }`-shaped, and worth getting
 * right since sending `{}` instead of omitting the body could otherwise be
 * mistaken for "sync nobody" rather than "sync everybody".
 */
interface Input {
  domain: string;
  emails?: string;
}

const userSync: ActionDefinition<Input> = {
  key: "user-sync",
  type: "perform",
  resource: "user",
  title: "Sync Users",
  description: "Re-sync one, several, or (leave Emails empty) all users of a published Softr app.",
  idempotent: true,
  params: [
    domainParam,
    {
      key: "emails",
      label: "Emails",
      type: "string",
      hint: "Comma-separated list of emails to sync. Leave empty to sync every user of the app.",
    },
  ],
  output: [{ key: "result", type: "object", label: "Raw response body — no schema is documented" }],

  async execute(input, ctx) {
    const emails = toList(input.emails);
    const result = await new StudioClient(ctx, input.domain).request("/users/sync", {
      method: "POST",
      ...(emails ? { body: emails } : {}),
    });
    return { result };
  },
};

export default userSync;

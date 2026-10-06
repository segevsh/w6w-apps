import type { ActionDefinition } from "@w6w/types";
import { compact, EgnyteClient, encodePath } from "../lib/client.ts";
import { pathParam } from "../lib/params.ts";

interface Input {
  path: string;
  lockToken?: string;
  lockTimeout?: number;
}

const fileLock: ActionDefinition<Input> = {
  key: "file-lock",
  type: "perform",
  resource: "file",
  title: "Lock File",
  description:
    "Lock a file so others cannot modify it. Keep the lock token — Unlock File needs it.",
  idempotent: false,
  params: [
    pathParam("Full path of the file to lock."),
    {
      key: "lockToken",
      label: "Lock token",
      type: "string",
      advanced: true,
      hint: "Token required to unlock. If blank, Egnyte generates one and returns it.",
    },
    {
      key: "lockTimeout",
      label: "Lock timeout (seconds)",
      type: "number",
      advanced: true,
      validation: { min: 1, max: 604800, integer: true },
      hint: "Defaults to 3600 (1 hour); maximum 604800 (7 days).",
    },
  ],
  output: [{ key: "lock_token", type: "string", label: "Lock token" }],

  async execute(input, ctx) {
    const res = await new EgnyteClient(ctx).request<Record<string, unknown> | undefined>(
      `/v1/fs/${encodePath(input.path)}`,
      {
        method: "POST",
        body: compact({
          action: "lock",
          lock_token: input.lockToken,
          lock_timeout: input.lockTimeout,
        }),
      },
    );
    return { ...(res ?? {}), lock_token: res?.lock_token ?? input.lockToken };
  },
};

export default fileLock;

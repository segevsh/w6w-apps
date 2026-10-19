import type { AuthDefinition } from "@w6w/types";
import { ADMIN_VERSION } from "../lib/client.ts";

export default {
  key: "organization-token",
  type: "bearer",
  displayName: "Organization Bot Token (Enterprise Admin)",
  description:
    "For Admin actions only. An organization owner creates this token in the Notion organization console and grants the required scopes.",
  fields: [{ key: "apiKey", label: "Organization Bot Token", type: "secret", required: true }],
  test({ credential }) {
    const fields = credential as Record<string, unknown>;
    const ok = ["apiKey"].every((key) =>
      typeof fields?.[key] === "string" && String(fields[key]).trim().length > 0
    );
    return {
      ok,
      message: ok
        ? "Credential fields supplied. This is a local check; permissions are verified when an action runs."
        : "Required credential fields are missing.",
    };
  },
  sign({ request, credential }) {
    if (!new URL(request.url).pathname.startsWith("/admin/")) {
      throw new Error(
        "Organization tokens are for Admin actions. Use a workspace connection for this action.",
      );
    }
    const { apiKey } = credential as { apiKey: string };
    request.headers.authorization = `Bearer ${apiKey}`;
    request.headers["Notion-Version"] = ADMIN_VERSION;
    return request;
  },
} satisfies AuthDefinition;

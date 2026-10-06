import type { ActionDefinition } from "@w6w/types";
import { compact, SkyvernClient } from "../lib/client.ts";
import { proxyLocationOptions } from "../lib/params.ts";

/** `POST /v1/browser_sessions` — start a persistent browser to share across runs. */
interface Input {
  url?: string;
  timeout?: number;
  proxyLocation?: string;
  browserType?: string;
  browserProfileId?: string;
  generateBrowserProfile?: boolean;
}

const browserSessionCreate: ActionDefinition<Input> = {
  key: "browser-session-create",
  type: "perform",
  resource: "browser-session",
  title: "Create Browser Session",
  description:
    "Start a persistent browser session. Pass its id to Run Task / Run Agent to keep login state and page context across runs.",
  idempotent: false,
  params: [
    { key: "url", label: "Start URL", type: "string", hint: "Optional page to open on start." },
    {
      key: "timeout",
      label: "Timeout (minutes)",
      type: "number",
      validation: { integer: true, min: 5, max: 240 },
      hint: "Applied after the session starts. Defaults to 60.",
    },
    {
      key: "proxyLocation",
      label: "Proxy location",
      type: "select",
      options: proxyLocationOptions,
    },
    {
      key: "browserType",
      label: "Browser type",
      type: "select",
      options: [
        { value: "chrome", label: "Chrome" },
        { value: "msedge", label: "Microsoft Edge" },
        { value: "stealth-chromium", label: "Stealth Chromium" },
      ],
    },
    {
      key: "browserProfileId",
      label: "Browser profile ID",
      type: "string",
      hint: "Load a saved profile (`bp_…`) — restores its cookies and local storage.",
    },
    {
      key: "generateBrowserProfile",
      label: "Save a profile when it ends",
      type: "boolean",
      hint: "Persist cookies and local storage so the session can become a reusable profile.",
    },
  ],
  output: [
    { key: "browser_session_id", type: "string", label: "Browser session ID (pbs_…)" },
    { key: "status", type: "string", label: "Status" },
    { key: "browser_address", type: "string", label: "Browser (CDP) address" },
    { key: "app_url", type: "string", label: "Skyvern app URL" },
    { key: "timeout", type: "number", label: "Timeout (minutes)" },
    { key: "warning", type: "string", label: "Advisory warning" },
  ],

  execute(input, ctx) {
    return new SkyvernClient(ctx).json("/v1/browser_sessions", {
      method: "POST",
      body: compact({
        url: input.url,
        timeout: input.timeout,
        proxy_location: input.proxyLocation,
        browser_type: input.browserType,
        browser_profile_id: input.browserProfileId,
        generate_browser_profile: input.generateBrowserProfile,
      }),
    });
  },
};

export default browserSessionCreate;

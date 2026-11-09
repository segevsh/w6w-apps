import { webhookTrigger } from "../lib/triggers.ts";

/** Release activity; `actions` narrows it (e.g. `published`). */
const release = webhookTrigger({
  key: "release",
  title: "Release Event",
  description:
    "Fires on release activity (published, created, edited, released and more). The run gets the action and the release.",
  event: "release",
  hasActions: true,
  output: [
    { key: "payload.release", type: "object", label: "Release" },
    { key: "payload.release.tag_name", type: "string", label: "Tag" },
    { key: "payload.release.html_url", type: "string", label: "URL" },
  ],
  samplePayload: {
    action: "published",
    release: {
      id: 1,
      tag_name: "v1.0.0",
      name: "First release",
      draft: false,
      prerelease: false,
      html_url: "https://github.com/octocat/Hello-World/releases/tag/v1.0.0",
    },
    repository: { full_name: "octocat/Hello-World" },
    sender: { login: "octocat" },
  },
});

export default release;

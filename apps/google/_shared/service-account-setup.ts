import type { AuthDefinition } from "@w6w/types";

const SERVICE_ACCOUNTS = "https://console.cloud.google.com/iam-admin/serviceaccounts";
const DELEGATION = "https://admin.google.com/ac/owl/domainwidedelegation";

/**
 * "Where do I get this?" for a Google service-account auth: create the account, turn on the
 * app's API, download a JSON key, and (when the app acts as a Workspace user) allow it under
 * domain-wide delegation. `apiId` is the API's id in the Google Cloud API library.
 */
export function serviceAccountSetup(
  apiName: string,
  apiId: string,
  impersonation: "required" | "optional" | "none",
): NonNullable<AuthDefinition["setup"]> {
  const steps: NonNullable<AuthDefinition["setup"]> = [
    {
      text: "In Google Cloud, create a service account (IAM & Admin → Service accounts → Create).",
      url: SERVICE_ACCOUNTS,
    },
    {
      text: `Turn on the ${apiName} for the same project.`,
      url: `https://console.cloud.google.com/apis/library/${apiId}`,
    },
    {
      text:
        "Open the service account → Keys → Add key → Create new key → JSON, and paste the downloaded file below.",
      url: SERVICE_ACCOUNTS,
    },
  ];
  if (impersonation === "required") {
    steps.push({
      text:
        "A Google Workspace admin opens Domain-wide delegation → Add new, pastes the key's Client ID (shown once you paste the key) and the Scopes below. Personal @gmail.com accounts can't do this.",
      url: DELEGATION,
    });
  } else if (impersonation === "optional") {
    steps.push({
      text:
        "To act as a Workspace user, a Workspace admin opens Domain-wide delegation → Add new, pastes the key's Client ID and the Scopes below. Otherwise share files with the service account's own email.",
      url: DELEGATION,
    });
  }
  return steps;
}

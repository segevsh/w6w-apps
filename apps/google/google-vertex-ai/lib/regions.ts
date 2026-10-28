/**
 * Where Vertex AI is served from.
 *
 * Vertex has one global host and one host per region, and a call has to go to
 * the host that matches the `locations/{location}` in its path. The list below
 * is the `endpoints` array of the discovery document Google serves from the API
 * itself (`https://aiplatform.googleapis.com/$discovery/rest?version=v1`, fetched
 * 2026-10-05, revision 20260930), minus the two multi-region `us` / `eu`
 * entries, which live on a different host family
 * (`aiplatform.us.rep.googleapis.com`) and are out of scope.
 *
 * It is a fixed list on purpose. The manifest's `network.allow` takes exact
 * hostnames and `*.domain` wildcards only, so `*-aiplatform.googleapis.com`
 * is not a valid entry, and `*.googleapis.com` would open every Google API. The
 * same list is the egress allowlist in `package.json`; a test keeps the two in
 * step, and `hostFor` refuses anything outside it, so a location typed into a
 * form can never steer a request at another host.
 */
export const REGIONS = [
  "africa-south1",
  "asia-east1",
  "asia-east2",
  "asia-northeast1",
  "asia-northeast2",
  "asia-northeast3",
  "asia-south1",
  "asia-south2",
  "asia-southeast1",
  "asia-southeast2",
  "australia-southeast1",
  "australia-southeast2",
  "europe-central2",
  "europe-north1",
  "europe-north2",
  "europe-southwest1",
  "europe-west1",
  "europe-west10",
  "europe-west12",
  "europe-west15",
  "europe-west2",
  "europe-west3",
  "europe-west4",
  "europe-west6",
  "europe-west8",
  "europe-west9",
  "me-central1",
  "me-central2",
  "me-west1",
  "northamerica-northeast1",
  "northamerica-northeast2",
  "southamerica-east1",
  "southamerica-west1",
  "us-central1",
  "us-central2",
  "us-east1",
  "us-east4",
  "us-east5",
  "us-east7",
  "us-south1",
  "us-west1",
  "us-west2",
  "us-west3",
  "us-west4",
  "us-west8",
] as const;

export type Region = typeof REGIONS[number];

/** `global` is served from the bare host; every region from `{region}-aiplatform`. */
export const LOCATIONS: readonly string[] = ["global", ...REGIONS];

export const GLOBAL_HOST = "aiplatform.googleapis.com";

export function isLocation(value: string): boolean {
  return LOCATIONS.includes(value);
}

/** The API host for a location. Throws for anything not on the fixed list. */
export function hostFor(location: string): string {
  if (!isLocation(location)) {
    throw new Error(
      `unknown Vertex AI location "${location}" — use "global" or one of the supported regions`,
    );
  }
  return location === "global" ? GLOBAL_HOST : `${location}-aiplatform.googleapis.com`;
}

/** Every host this app may call — the manifest's `network.allow`. */
export const ALL_HOSTS: readonly string[] = LOCATIONS.map(hostFor);

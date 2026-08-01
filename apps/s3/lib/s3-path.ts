/**
 * Encode an S3 object key for use in a request path. S3 has no real
 * directories — a `/` in a key is just a character some clients group on —
 * so each `/`-separated segment is percent-encoded independently and the
 * separators are kept literal, matching how every S3 client builds a
 * request URL for a hierarchical-looking key.
 */
export function encodeS3Key(key: string): string {
  return key.split("/").map(encodeURIComponent).join("/");
}

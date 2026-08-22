/**
 * A throwaway RSA key and the V4 signature it produces, so the signing
 * implementation is checked against something other than itself.
 *
 * The expected signature was computed **independently**, in Python with
 * `cryptography`, from Google's documented canonical-request format rather
 * than from this app's code. If `lib/signing.ts` drifts — a header dropped
 * from the canonical set, the query sorted differently, the path encoded
 * another way — this test fails even though the code would still be
 * internally consistent.
 *
 * The key exists only in this file and has never been a credential for
 * anything.
 */
export const TEST_PRIVATE_KEY = "-----BEGIN PRIVATE KEY-----\n" +
  "MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCs5L75gKFT9Z61\n" +
  "nuQ3qv5R92HDyXenCDTmOrgK2Bt7BFMKRUtDbUBTqgTnTTw/EwjoN+1u8Mayaa35\n" +
  "GtWC5rPPX9XJpv7lXOeG9CNk7jm4OVS6bzvv8PvecvDi+A5rPpMpXvuhwqVaKfiT\n" +
  "yQjsIOrSUHpP5YrUuaA5CxDKXDTvoc5A2NJCJD6W1WOxRxBLtol+eWqOmw3Rtyuv\n" +
  "XTQ60vFeIs3cFTfF0WPSTLlkHu9XoTKKX04Ue8zYD64I7z3NjX6FNcIz3yoAkRwS\n" +
  "n/Mrim5CFGJHn9L5lEk6PjhYo1NV8qhCJFAGir6+4FLEcoxQj5uKNCRek1kTG8y0\n" +
  "9Yrk47C/AgMBAAECggEATjfwxG0yz4q8Qju/0QWNqGSMeOjBNrKqSAyBrfpGOHnk\n" +
  "3a0q1zbqls9BB6n0Gy8P5QtEYmAQ7K+N8zh2JxIbgDLBxEjGYdsNrgrupl92goeB\n" +
  "cxUW3z89m86Rd4W09ETrjBh6LB0k9K0vViDp5fYgdoTNSS82h3XxbE06y+o6Ury3\n" +
  "u/XABVnnpEsnysU1Qyi9EXzi0eM2kl0Zm10ldxXs6Vux3vZb3GqBOh+bVWEdLTAc\n" +
  "SFAa7bzkzpNEruIvbYdNXkVej1J8Z+HsaU3SycIDOKABC3ei5x6Bw1jQ/sy7GrAV\n" +
  "dy4XlmSi0DAdKE60p1oMhqqh7zPXHpzNy45DXVDk3QKBgQDwx6Bsk2yIOocuB3Bx\n" +
  "uaHqKxmT1cWPv58dljV+l4EdR8IyVLVI7AJpTblBio086pgZyvc0wc3wwwADTC9N\n" +
  "K7M7iP+5ygLWn6hDTrSq/zTQEm/HpAGcay8QaSqPCeAJ+6UqqA99vIElBhkac1EM\n" +
  "L8F5KIARoLMTDxDS/Ju7zbuAowKBgQC30pAbpK07AHyb77BpqmhNnAyFMgg1zTr3\n" +
  "vp5xv96eL5e41zEToVMdg/o3M4vzTzTIHiaaHu55MeczUyrfOUyIMSvXddB28sTL\n" +
  "31osssv1ZQ574Ugv8c1E/gEU93TBQbgvwgS0ELaKuuGaaBK5L9O1cAoFhi7b+r6W\n" +
  "481OHcOlNQKBgQDI2AwGZZbzr7aQ+52dD5ZzKY6FVZ0dQl8so95tgV0vGmtv5l7t\n" +
  "vAhq5G1ysWsM9Db51OcON9dcTJyXI5aVTa2NLML7q/lgI/+MXXuw436fTbG2GyVI\n" +
  "39N7Ye4hMMCUMzfb9CIv5OzpAEQyXxytCKzfLpxdl+moLToAdLxHFN6h9wKBgAJ8\n" +
  "MEKPaWAg045wIRxsl1hlQa4TTRUdHyz2QMIc6++LiSuQjTNMvQjrHdjdM4koivgh\n" +
  "oDf5LxQoXo3NFAlMhwJYV9Vj3FufUJXJATkVebhpk1aNZyJuzG2gWXdlGQj70Hek\n" +
  "0dd1WmJpwF8MBSTHxr7vMtN8Sunia+0ySzZBJMH5AoGATl9nY0Ors+aPCfNMjd1m\n" +
  "SPtBy73tyYX/pclxHDhh7NfLaXDQSdDPJRQv/ADZUocWyoHt4d04vrz2P1+KDrbH\n" +
  "bzsp20OsCjOieM8aIfO41zmXGEW4x44L5LHK8xSOIxOcHMZuxrVz7tpvBFE3R1aY\n" +
  "GPuKFEmPDHO/TufBeb7hqv0=\n" +
  "-----END PRIVATE KEY-----";

export const TEST_CLIENT_EMAIL = "signer@test-project.iam.gserviceaccount.com";

/** 2026-08-19T12:00:00Z, as milliseconds — the signature is time-dependent. */
export const TEST_NOW = Date.UTC(2026, 7, 19, 12, 0, 0);

/**
 * GET example-bucket/"cat pics/tabby.jpeg", 3600s, signed at TEST_NOW.
 * Computed by the reference implementation, not by this one.
 */
export const EXPECTED_SIGNATURE =
  "862c587cc5fda5224a73961537d6d3fb94ee786079ab52dc57d23a6992ec74864ba2b6cf5bae74c98d8ce68bf70373d3f391501e2a4635bcbfbe641d1af02be4e776e3baf732390b2f9ec51c7a19965ba7b19feb6a1a46ad25b52ebbe3be6ff72e4576a0e998d97da47a22e2aca8fe0c14aac786f5f0ecb8c7ae89bd74680fd0dc26e587a40225a4cfa7b82c6b4f40ad7bfbd5d3e44a96df8f5acd1de7cb8226b9c075c080b02e2ac8add728d4c4f7375d4d0b472fd2b53f22384cdee660ff4a56eb0e40378a76c5b214436c96f0e55376b88a3cb9f49336eca693310475c494e41b4ae16f761cc0395ec5899c52e6a9d678793d9110f2d6b54ce6cc9369f911";

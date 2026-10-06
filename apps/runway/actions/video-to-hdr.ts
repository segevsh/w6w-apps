import { generationAction, modelParam } from "../lib/generation.ts";

interface Input extends Record<string, unknown> {
  model: string;
  videoUri: string;
  outputFormat?: string;
  proresProfile?: string;
}

/** `POST /v1/video_to_hdr` — one model today, `ruby`. */
export default generationAction<Input>({
  key: "video-to-hdr",
  title: "Video to HDR",
  description: "Start an SDR to HDR conversion of a video.",
  path: "/v1/video_to_hdr",
  params: [
    modelParam("The HDR model id.", "ruby"),
    { key: "videoUri", label: "Video URI", type: "string", required: true },
    {
      key: "outputFormat",
      label: "Output format",
      type: "select",
      options: [
        "hdr10",
        "hlg",
        "hdr_prores",
        "hdr_exr_sequence",
        "hdr_exr_acescg_sequence_1_3",
        "hdr_exr_acescg_sequence_2_0",
      ].map((v) => ({ value: v, label: v })),
    },
    {
      key: "proresProfile",
      label: "ProRes profile",
      type: "select",
      options: ["422", "4444", "422 HQ"].map((v) => ({ value: v, label: v })),
      hint: "For the hdr_prores output.",
    },
  ],
  build: (i) => ({
    videoUri: i.videoUri,
    outputFormat: i.outputFormat,
    proresProfile: i.proresProfile,
  }),
});

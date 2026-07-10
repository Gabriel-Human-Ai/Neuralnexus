export type CaptureAction = "save_reference" | "review" | "compare" | "verify" | "preflight";
export type CaptureType = "selection" | "page" | "screenshot";
export type CaptureDecision = "approve" | "reject" | "revise" | "keep" | "mark_wrong";

export type PageCapture = {
  title: string;
  sourceUrl: string;
  text: string;
};

export type CapturePayload = PageCapture & {
  captureType: CaptureType;
  action: CaptureAction;
  screenshotData?: string;
};

export type ExtensionSettings = {
  appUrl: string;
  token: string;
};

export type CaptureResponse = {
  capture?: {
    id: string;
    title: string;
    sourceHost: string;
    captureType: CaptureType;
    action: CaptureAction;
    summary: string;
  };
  nextActions?: CaptureDecision[];
  indexPreview?: Record<string, unknown>;
  error?: string;
};

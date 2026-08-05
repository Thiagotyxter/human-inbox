import crypto from "node:crypto";

const DEFAULT_TOLERANCE_SECONDS = 300;

export function signWebhook(secret: string, timestamp: string, rawBody: string | Buffer) {
  const payload = `${timestamp}.${typeof rawBody === "string" ? rawBody : rawBody.toString("utf8")}`;
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

export function verifyWebhookSignature(params: {
  secret: string;
  timestamp: string;
  rawBody: string | Buffer;
  signature: string;
  toleranceSeconds?: number;
  nowSeconds?: number;
}) {
  const timestampSeconds = Number(params.timestamp);

  if (!Number.isFinite(timestampSeconds)) {
    return false;
  }

  const nowSeconds = params.nowSeconds ?? Math.floor(Date.now() / 1000);
  const toleranceSeconds = params.toleranceSeconds ?? DEFAULT_TOLERANCE_SECONDS;

  if (Math.abs(nowSeconds - timestampSeconds) > toleranceSeconds) {
    return false;
  }

  const expected = signWebhook(params.secret, params.timestamp, params.rawBody);
  const expectedBuffer = Buffer.from(expected);
  const signatureBuffer = Buffer.from(params.signature);

  if (expectedBuffer.length !== signatureBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, signatureBuffer);
}

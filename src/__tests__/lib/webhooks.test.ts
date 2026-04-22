import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createHmac } from "node:crypto";
import { sendSignedWebhook } from "@/lib/webhooks";

const SECRET = "test-secret";

describe("sendSignedWebhook — HMAC correctness (AI-SAFETY-02, Pitfall 1)", () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    process.env.N8N_WEBHOOK_SECRET = SECRET;
    process.env.N8N_WEBHOOK_URL = "http://n8n.test";
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
    vi.restoreAllMocks();
  });

  it("signs the EXACT string that gets POSTed (raw-body identity)", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response("", { status: 200 }));
    global.fetch = fetchMock as never;

    await sendSignedWebhook(
      "job-company-intel",
      { job_id: 42, extra: "payload" },
      "deadbeef-cafe-babe-face-feeddeadbeef",
    );

    const [url, init] = fetchMock.mock.calls[0];
    const sentBody = (init as RequestInit).body as string;
    const headers = (init as RequestInit).headers as Record<string, string>;

    const canonical = `${headers["X-Hudsonfam-Timestamp"]}.job-company-intel.${sentBody}`;
    const expected = `sha256=${createHmac("sha256", SECRET)
      .update(canonical)
      .digest("hex")}`;

    expect(headers["X-Hudsonfam-Signature"]).toBe(expected);
    expect(headers["X-Idempotency-Key"]).toBe(
      "deadbeef-cafe-babe-face-feeddeadbeef",
    );
    expect(url).toBe("http://n8n.test/webhook/job-company-intel");
  });

  it("URL construction uses WEBHOOK_BASE + /webhook/ + path", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response("", { status: 200 }));
    global.fetch = fetchMock as never;

    await sendSignedWebhook("job-regenerate-resume", { job_id: 1 }, "uuid-1");

    const [url] = fetchMock.mock.calls[0];
    expect(url).toBe("http://n8n.test/webhook/job-regenerate-resume");
  });

  it("X-Idempotency-Key is the exact caller-supplied value across distinct calls", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response("", { status: 200 }));
    global.fetch = fetchMock as never;
    await sendSignedWebhook("p", { a: 1 }, "uuid-A");
    await sendSignedWebhook("p", { a: 1 }, "uuid-B");
    expect(
      (fetchMock.mock.calls[0][1] as RequestInit).headers as Record<
        string,
        string
      >,
    ).toMatchObject({ "X-Idempotency-Key": "uuid-A" });
    expect(
      (fetchMock.mock.calls[1][1] as RequestInit).headers as Record<
        string,
        string
      >,
    ).toMatchObject({ "X-Idempotency-Key": "uuid-B" });
  });

  it("sets Content-Type: application/json", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response("", { status: 200 }));
    global.fetch = fetchMock as never;
    await sendSignedWebhook("p", { a: 1 }, "k");
    const headers = (fetchMock.mock.calls[0][1] as RequestInit)
      .headers as Record<string, string>;
    expect(headers["Content-Type"]).toBe("application/json");
  });

  it("returns { ok: true } on 2xx", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue(new Response("", { status: 200 })) as never;
    const res = await sendSignedWebhook("p", { a: 1 }, "k");
    expect(res).toEqual({ ok: true });
  });
});

describe("sendSignedWebhook — error-to-sentinel cascade (AI-SAFETY-04, D-07)", () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    process.env.N8N_WEBHOOK_SECRET = SECRET;
    process.env.N8N_WEBHOOK_URL = "http://n8n.test";
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    errorSpy.mockRestore();
    vi.restoreAllMocks();
  });

  it.each([
    [401, "auth"],
    [403, "auth"],
    [429, "rate limit"],
    [500, "unavailable"],
    [502, "unavailable"],
    [503, "unavailable"],
  ] as const)("HTTP %d → sentinel %s", async (status, expected) => {
    global.fetch = vi
      .fn()
      .mockResolvedValue(new Response("", { status })) as never;
    const res = await sendSignedWebhook(
      "job-company-intel",
      { job_id: 1 },
      "k",
    );
    expect(res).toEqual({ ok: false, sentinel: expected });
    expect(errorSpy).toHaveBeenCalled();
  });

  it("AbortError → timeout", async () => {
    const err = new Error("aborted");
    err.name = "AbortError";
    global.fetch = vi.fn().mockRejectedValue(err) as never;
    const res = await sendSignedWebhook("x", {}, "k");
    expect(res).toEqual({ ok: false, sentinel: "timeout" });
  });

  it("TimeoutError → timeout", async () => {
    const err = new Error("request timed out");
    err.name = "TimeoutError";
    global.fetch = vi.fn().mockRejectedValue(err) as never;
    const res = await sendSignedWebhook("x", {}, "k");
    expect(res).toEqual({ ok: false, sentinel: "timeout" });
  });

  it("generic network Error → unavailable", async () => {
    global.fetch = vi
      .fn()
      .mockRejectedValue(new Error("ECONNREFUSED")) as never;
    const res = await sendSignedWebhook("x", {}, "k");
    expect(res).toEqual({ ok: false, sentinel: "unavailable" });
  });
});

describe("sendSignedWebhook — no raw-error leak (AI-SAFETY-04, D-08)", () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    process.env.N8N_WEBHOOK_SECRET = SECRET;
    process.env.N8N_WEBHOOK_URL = "http://n8n.test";
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    errorSpy.mockRestore();
    vi.restoreAllMocks();
  });

  it("raw error never leaks to return value (only sentinel string)", async () => {
    global.fetch = vi
      .fn()
      .mockRejectedValue(
        new Error("SECRET: internal-host-10.0.5.2 refused"),
      ) as never;
    const res = await sendSignedWebhook("x", {}, "k");
    expect(res).toEqual({ ok: false, sentinel: "unavailable" });
    expect(JSON.stringify(res)).not.toMatch(/internal-host/);
    expect(JSON.stringify(res)).not.toMatch(/10\.0\.5\.2/);
    expect(JSON.stringify(res)).not.toMatch(/SECRET/);
  });

  it("console.error logs the full error + path on failure", async () => {
    const err = new Error("boom");
    global.fetch = vi.fn().mockRejectedValue(err) as never;
    await sendSignedWebhook("job-company-intel", {}, "k");
    expect(errorSpy).toHaveBeenCalled();
    const logPayload = errorSpy.mock.calls[0];
    const asString = JSON.stringify(logPayload);
    expect(asString).toMatch(/job-company-intel/);
  });

  it("missing N8N_WEBHOOK_SECRET returns { ok:false, sentinel:'unavailable' } without throwing", async () => {
    delete process.env.N8N_WEBHOOK_SECRET;
    const res = await sendSignedWebhook("x", {}, "k");
    expect(res).toEqual({ ok: false, sentinel: "unavailable" });
  });
});

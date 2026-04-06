import { requireRole } from "@/lib/session";
import { getCoverLetterPdf } from "@/lib/jobs-db";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireRole(["owner"]);

  const { id } = await params;
  const jobId = parseInt(id, 10);
  if (isNaN(jobId)) {
    return NextResponse.json({ error: "Invalid job ID" }, { status: 400 });
  }

  const pdfBase64 = await getCoverLetterPdf(jobId);
  if (!pdfBase64) {
    return NextResponse.json({ error: "No PDF available" }, { status: 404 });
  }

  const pdfBuffer = Buffer.from(pdfBase64, "base64");

  return new NextResponse(pdfBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="cover-letter-job-${jobId}.pdf"`,
      "Content-Length": String(pdfBuffer.length),
    },
  });
}

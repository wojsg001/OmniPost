import { NextResponse } from "next/server";
import { existsSync, readFileSync } from "fs";
import path from "path";

export const dynamic = "force-dynamic";

const TYPES: Record<string, string> = {
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

export async function GET(_req: Request, { params }: { params: { name: string } }) {
  const name = path.basename(params.name);
  const file = path.join(process.cwd(), "data", "uploads", name);
  if (!existsSync(file)) return NextResponse.json({ error: "not found" }, { status: 404 });
  const ext = path.extname(name).toLowerCase();
  return new NextResponse(readFileSync(file), {
    headers: {
      "Content-Type": TYPES[ext] || "application/octet-stream",
      "Cache-Control": "public, max-age=86400",
    },
  });
}

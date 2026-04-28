import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const page: string = typeof body.page === "string" ? body.page : "/";

    // Read or create visitor_id cookie
    let visitorId = req.cookies.get("visitor_id")?.value;
    const isNew = !visitorId;
    if (!visitorId) {
      visitorId = crypto.randomUUID();
    }

    const supabase = createSupabaseAdminClient();
    await supabase.from("page_visits").insert({ visitor_id: visitorId, page });

    const res = NextResponse.json({ ok: true });

    if (isNew) {
      // Set 1-year cookie
      res.cookies.set("visitor_id", visitorId, {
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
        httpOnly: true,
        sameSite: "lax",
      });
    }

    return res;
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

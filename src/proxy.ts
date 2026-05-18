/**
 * Next.js 16 Proxy (구 Middleware) — 세션·경로 가드.
 *
 * Next.js 16부터 `middleware` 파일 컨벤션이 deprecated → `proxy` 로 변경됨.
 * 함수 이름·로직은 동일하며, 내부 헬퍼 `updateSession` 도 그대로 사용한다.
 */
import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * 다음 경로를 제외한 모든 요청에 proxy 적용:
     * - _next/static, _next/image, favicon
     * - public 파일 (이미지·폰트)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2)$).*)",
  ],
};

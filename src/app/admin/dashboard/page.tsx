import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const supabase = await createSupabaseServerClient();

  const [propsCount, gongbuCount, custCount, errCount] = await Promise.all([
    supabase.from("properties").select("*", { count: "exact", head: true }),
    supabase.from("gongbu_documents").select("*", { count: "exact", head: true }),
    supabase.from("customers").select("*", { count: "exact", head: true }),
    supabase.from("error_logs").select("*", { count: "exact", head: true }),
  ]);

  const stats = [
    { label: "총 매물", value: propsCount.count ?? 0 },
    { label: "수집 공부", value: gongbuCount.count ?? 0 },
    { label: "고객", value: custCount.count ?? 0 },
    { label: "오류 로그", value: errCount.count ?? 0 },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">관리자 대시보드</h1>
          <p className="text-sm text-neutral-500 mt-1">
            A1-SMART v2.0 — 부동산 정보 자동화 플랫폼
          </p>
        </div>
        <Link href="/admin/properties/new">
          <Button>
            <PlusCircle className="h-4 w-4 mr-2" />
            매물 신규 등록
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-neutral-500">
                {s.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{s.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>다음 단계</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-neutral-600 space-y-2">
          <p>
            매물을 등록하려면 우상단 <strong>매물 신규 등록</strong> 버튼을 클릭하세요.
          </p>
          <p className="text-xs text-neutral-400">
            현재 단계 1 자료수집 UI 와 Supabase Storage 업로드가 활성화되어 있습니다.
            단계 4(OCR + LLM 분석)는 M3 마일스톤에서 연결됩니다.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

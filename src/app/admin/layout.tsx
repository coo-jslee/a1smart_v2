import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logoutAction } from "../(auth)/actions";
import { Button } from "@/components/ui/button";
import {
  Building2,
  Users,
  AlertTriangle,
  Settings,
  LayoutDashboard,
  PlusCircle,
} from "lucide-react";

const NAV = [
  { href: "/admin/dashboard", label: "대시보드", icon: LayoutDashboard },
  { href: "/admin/properties", label: "매물", icon: Building2 },
  { href: "/admin/properties/new", label: "매물 등록", icon: PlusCircle },
  { href: "/admin/customers", label: "고객", icon: Users },
  { href: "/admin/errors", label: "오류 로그", icon: AlertTriangle },
  { href: "/admin/settings", label: "환경설정", icon: Settings },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name, email")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    redirect("/?forbidden=1");
  }

  return (
    <div className="flex min-h-screen bg-neutral-50">
      <aside className="w-60 bg-white border-r border-neutral-200 flex flex-col">
        <Link href="/admin/dashboard" className="px-6 py-5 flex items-center gap-3 border-b">
          <Image src="/logo_v1.png" alt="A1Smart" width={36} height={36} className="rounded" />
          <div className="leading-tight">
            <div className="font-bold text-sm">A1Smart</div>
            <div className="text-[11px] text-neutral-500">관리자 콘솔</div>
          </div>
        </Link>
        <nav className="flex-1 px-2 py-4 space-y-1">
          {NAV.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-3 py-2 rounded text-sm text-neutral-700 hover:bg-neutral-100"
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t p-3 space-y-2">
          <div className="px-2 text-xs text-neutral-500 truncate">
            {profile?.full_name || profile?.email || user.email}
          </div>
          <form action={logoutAction}>
            <Button variant="outline" size="sm" type="submit" className="w-full">
              로그아웃
            </Button>
          </form>
        </div>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}

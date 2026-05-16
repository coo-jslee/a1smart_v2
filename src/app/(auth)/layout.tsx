import Link from "next/link";
import Image from "next/image";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 p-4">
      <div className="w-full max-w-md">
        <Link href="/" className="flex flex-col items-center mb-6">
          <Image
            src="/logo_v1.png"
            alt="A1Smart"
            width={88}
            height={88}
            priority
            className="rounded"
          />
          <span className="mt-2 text-sm text-neutral-500">
            에이원스마트부동산중개법인
          </span>
        </Link>
        {children}
      </div>
    </div>
  );
}

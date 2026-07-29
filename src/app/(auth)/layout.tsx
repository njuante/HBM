import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col">
      <div className="flex h-14 items-center justify-between px-5">
        <Link
          href="/"
          className="font-serif text-lg font-medium tracking-tight"
        >
          HBM
        </Link>
        <ThemeToggle />
      </div>
      <div className="flex flex-1 items-center justify-center px-4 pb-20">
        <div className="w-full max-w-[22rem]">{children}</div>
      </div>
    </div>
  );
}

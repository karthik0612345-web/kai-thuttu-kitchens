import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-white/10 bg-[#080604] px-5 py-8 text-sm text-zinc-400 sm:px-8 lg:px-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <p className="font-semibold">
          Kai Thuttu Kitchens | Traditional, Homestyle, Love
        </p>
        <div className="flex flex-wrap gap-4">
          <Link href="/terms-and-conditions" className="transition hover:text-[#E9B44C]">
            Terms and Conditions
          </Link>
          <Link href="/privacy-policy" className="transition hover:text-[#E9B44C]">
            Privacy Policy
          </Link>
          <Link href="/refund-cancellation-policy" className="transition hover:text-[#E9B44C]">
            Refund and Cancellation
          </Link>
        </div>
      </div>
    </footer>
  );
}

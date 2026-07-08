import Link from "next/link";
import Navbar from "@/components/Navbar";

type PolicySection = {
  title: string;
  body: string[];
};

export default function PolicyPage({
  eyebrow,
  title,
  intro,
  sections,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  sections: PolicySection[];
}) {
  return (
    <main className="min-h-screen bg-[#111111] text-white">
      <Navbar />

      <section className="relative isolate overflow-hidden px-5 py-16 sm:px-8 lg:px-10">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_20%,rgba(249,115,22,0.2),transparent_30%),radial-gradient(circle_at_85%_0%,rgba(233,180,76,0.13),transparent_28%)]" />
        <div className="mx-auto max-w-5xl">
          <p className="text-sm font-black uppercase tracking-[0.24em] text-[#F97316]">
            {eyebrow}
          </p>
          <h1 className="mt-4 text-4xl font-black tracking-tight text-white sm:text-6xl">
            {title}
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-8 text-zinc-300 sm:text-lg">
            {intro}
          </p>
          <p className="mt-5 text-sm font-bold text-[#E9B44C]">
            Last updated: July 8, 2026
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 pb-20 sm:px-8 lg:px-10">
        <div className="grid gap-5">
          {sections.map((section, index) => (
            <article
              key={section.title}
              className="rounded-lg border border-white/10 bg-white/[0.05] p-6 sm:p-8"
            >
              <h2 className="text-2xl font-black text-[#E9B44C]">
                {index + 1}. {section.title}
              </h2>
              <div className="mt-4 grid gap-4 text-sm leading-7 text-zinc-300 sm:text-base">
                {section.body.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </article>
          ))}
        </div>

        <div className="mt-8 rounded-lg border border-[#E9B44C]/25 bg-[#2D1B14] p-6">
          <p className="font-black text-white">Need help?</p>
          <p className="mt-2 text-sm leading-7 text-zinc-300">
            For order, payment, delivery, refund, or privacy questions, contact
            Kai Thuttu Kitchens on{" "}
            <a href="tel:+917676198004" className="font-bold text-[#E9B44C]">
              +91 76761 98004
            </a>
            .
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/terms-and-conditions" className="text-sm font-bold text-[#E9B44C] hover:text-white">
              Terms
            </Link>
            <Link href="/privacy-policy" className="text-sm font-bold text-[#E9B44C] hover:text-white">
              Privacy
            </Link>
            <Link href="/refund-cancellation-policy" className="text-sm font-bold text-[#E9B44C] hover:text-white">
              Refunds
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

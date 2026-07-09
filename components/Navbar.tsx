"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/components/CartContext";
import { useAuth } from "@/components/AuthProvider";
import { useCustomerAuthGate } from "@/components/CustomerAuthGate";

const navItems = [
  { label: "Home", href: "/" },
  { label: "Menu", href: "/menu" },
  { label: "Track", href: "/order-tracking" },
  { label: "About", href: "/#about" },
  { label: "Contact", href: "/#contact" },
];

function CartIcon() {
  return (
    <svg
      aria-hidden="true"
      className="size-5"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="M6 6h15l-1.5 8.5a2 2 0 0 1-2 1.5H9a2 2 0 0 1-2-1.6L5 3H2" />
      <circle cx="9" cy="20" r="1" />
      <circle cx="18" cy="20" r="1" />
    </svg>
  );
}

function MenuIcon({ isOpen }: { isOpen: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className="size-6"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      {isOpen ? (
        <path d="M6 6l12 12M18 6 6 18" />
      ) : (
        <path d="M4 7h16M4 12h16M4 17h16" />
      )}
    </svg>
  );
}

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const { cartCount, openCart } = useCart();
  const { user, signOut } = useAuth();
  const { requireCustomerAuth, openCustomerLogin } = useCustomerAuthGate();

  const closeMenu = () => setIsOpen(false);
  const openCartAndCloseMenu = () => {
    closeMenu();
    requireCustomerAuth(openCart);
  };

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-black/85 backdrop-blur-xl">
      <nav className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-8 lg:px-10">
        <Link
          href="/"
          className="group inline-flex min-w-0 items-center gap-3"
          onClick={closeMenu}
        >
          <span className="relative size-12 shrink-0 overflow-hidden rounded-full border border-amber-300/60 bg-black shadow-[0_0_24px_rgba(245,158,11,0.34)] transition duration-300 group-hover:scale-105 group-hover:border-orange-400">
            <Image
              src="/kai-thuttu-logo.jpeg"
              alt="Kai Thuttu Kitchens logo"
              fill
              sizes="48px"
              className="object-cover"
              priority
            />
          </span>
          <span className="truncate text-sm font-black uppercase tracking-[0.18em] text-amber-100 transition-colors group-hover:text-orange-300 sm:text-base">
            Kai Thuttu Kitchens
          </span>
        </Link>

        <div className="hidden items-center gap-2 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="rounded-full px-4 py-2 text-sm font-bold text-zinc-200 transition duration-300 hover:-translate-y-0.5 hover:bg-white/10 hover:text-amber-300"
            >
              {item.label}
            </Link>
          ))}
          {user ? (
            <button
              type="button"
              onClick={() => void signOut()}
              title={user.phoneNumber ?? user.email ?? "Signed in"}
              className="rounded-full px-4 py-2 text-sm font-bold text-zinc-200 transition hover:bg-white/10 hover:text-amber-300"
            >
              Sign out
            </button>
          ) : (
            <button
              type="button"
              onClick={openCustomerLogin}
              className="rounded-full px-4 py-2 text-sm font-bold text-zinc-200 transition hover:bg-white/10 hover:text-amber-300"
            >
              Login
            </button>
          )}
          <button
            type="button"
            onClick={() => requireCustomerAuth(openCart)}
            aria-label="Cart"
            className="relative ml-2 grid size-11 place-items-center rounded-full border border-amber-300/40 text-amber-200 transition duration-300 hover:-translate-y-0.5 hover:border-amber-300 hover:bg-amber-300 hover:text-black"
          >
            <CartIcon />
            {cartCount > 0 && (
              <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-[#F97316] text-[11px] font-black text-white">
                {cartCount}
              </span>
            )}
          </button>
        </div>

        <button
          type="button"
          aria-label={isOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={isOpen}
          onClick={() => setIsOpen((current) => !current)}
          className="grid size-11 place-items-center rounded-full border border-amber-300/40 text-amber-100 transition duration-300 hover:border-amber-300 hover:bg-amber-300 hover:text-black md:hidden"
        >
          <MenuIcon isOpen={isOpen} />
        </button>
      </nav>

      <div
        className={`grid overflow-hidden border-t border-white/10 bg-[#080604] transition-[grid-template-rows,opacity] duration-300 md:hidden ${
          isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="min-h-0">
          <div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-4 sm:px-8">
            {navItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                onClick={closeMenu}
                className="rounded-lg px-4 py-3 text-base font-bold text-zinc-100 transition duration-300 hover:bg-white/10 hover:text-amber-300"
              >
                {item.label}
              </Link>
            ))}
            {user ? (
              <button
                type="button"
                onClick={() => {
                  closeMenu();
                  void signOut();
                }}
                className="rounded-lg px-4 py-3 text-left text-base font-bold text-zinc-100 transition hover:bg-white/10 hover:text-amber-300"
              >
                Sign out ({user.phoneNumber ?? user.email})
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  closeMenu();
                  openCustomerLogin();
                }}
                className="rounded-lg px-4 py-3 text-left text-base font-bold text-zinc-100 transition hover:bg-white/10 hover:text-amber-300"
              >
                Customer login
              </button>
            )}
            <button
              type="button"
              onClick={openCartAndCloseMenu}
              className="mt-2 inline-flex items-center justify-center gap-2 rounded-lg bg-amber-400 px-4 py-3 text-base font-black text-black transition duration-300 hover:bg-orange-500 hover:text-white"
            >
              <CartIcon />
              Cart {cartCount > 0 ? `(${cartCount})` : ""}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

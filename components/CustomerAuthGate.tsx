"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import CustomerPhoneAuthForm from "@/components/CustomerPhoneAuthForm";
import { useAuth } from "@/components/AuthProvider";

type CustomerAuthGateValue = {
  requireCustomerAuth: (afterLogin?: () => void) => boolean;
  openCustomerLogin: () => void;
  closeCustomerLogin: () => void;
};

const CustomerAuthGateContext = createContext<
  CustomerAuthGateValue | undefined
>(undefined);

export function CustomerAuthGateProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { user, isAuthReady } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const pendingAction = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!user || !pendingAction.current) {
      return;
    }

    const action = pendingAction.current;
    pendingAction.current = null;
    setIsOpen(false);
    action();
  }, [user]);

  const requireCustomerAuth = useCallback(
    (afterLogin?: () => void) => {
      if (isAuthReady && user) {
        afterLogin?.();
        return true;
      }

      pendingAction.current = afterLogin ?? null;
      setIsOpen(true);
      return false;
    },
    [isAuthReady, user],
  );

  const closeCustomerLogin = () => {
    pendingAction.current = null;
    setIsOpen(false);
  };

  return (
    <CustomerAuthGateContext.Provider
      value={{
        requireCustomerAuth,
        openCustomerLogin: () => setIsOpen(true),
        closeCustomerLogin,
      }}
    >
      {children}
      <div
        className={`fixed inset-0 z-[90] grid place-items-center bg-black/75 p-4 backdrop-blur-sm transition ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) {
            closeCustomerLogin();
          }
        }}
      >
        <section
          role="dialog"
          aria-modal="true"
          aria-label="Customer mobile login"
          className="relative max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-lg border border-[#E9B44C]/30 bg-[#15120f] p-6 shadow-2xl sm:p-8"
        >
          <button
            type="button"
            onClick={closeCustomerLogin}
            aria-label="Close login"
            className="absolute right-4 top-4 grid size-10 place-items-center rounded-full border border-white/15 text-xl text-white transition hover:border-[#E9B44C] hover:text-[#E9B44C]"
          >
            x
          </button>
          <CustomerPhoneAuthForm compact onSuccess={() => setIsOpen(false)} />
        </section>
      </div>
    </CustomerAuthGateContext.Provider>
  );
}

export function useCustomerAuthGate() {
  const context = useContext(CustomerAuthGateContext);

  if (!context) {
    throw new Error(
      "useCustomerAuthGate must be used within CustomerAuthGateProvider",
    );
  }

  return context;
}

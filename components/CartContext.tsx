"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useCustomerAuthGate } from "@/components/CustomerAuthGate";

export type CartMenuItem = {
  name: string;
  price: string;
  priceValue: number;
  category: string;
};

export type CartLine = CartMenuItem & {
  quantity: number;
  lineTotal: number;
};

type StoredCartItem = CartMenuItem & {
  quantity: number;
};

type CartContextValue = {
  cartLines: CartLine[];
  cartCount: number;
  cartTotal: number;
  isCartOpen: boolean;
  addToCart: (item: CartMenuItem) => void;
  removeFromCart: (itemName: string) => void;
  increaseQuantity: (itemName: string) => void;
  decreaseQuantity: (itemName: string) => void;
  clearCart: () => void;
  openCart: () => void;
  closeCart: () => void;
  getItemQuantity: (itemName: string) => number;
};

const CartContext = createContext<CartContextValue | undefined>(undefined);
const cartStorageKey = "kai-thuttu-cart";

export function CartProvider({ children }: { children: ReactNode }) {
  const { requireCustomerAuth } = useCustomerAuthGate();
  const [cartItems, setCartItems] = useState<Record<string, StoredCartItem>>({});
  const [hasLoadedCart, setHasLoadedCart] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    window.setTimeout(() => {
      try {
        const savedCart = window.localStorage.getItem(cartStorageKey);

        if (savedCart) {
          const parsedCart = JSON.parse(savedCart) as Record<string, StoredCartItem>;
          setCartItems(parsedCart);
        }
      } catch {
        setCartItems({});
      } finally {
        setHasLoadedCart(true);
      }
    }, 0);
  }, []);

  useEffect(() => {
    if (!hasLoadedCart) {
      return;
    }

    window.localStorage.setItem(cartStorageKey, JSON.stringify(cartItems));
  }, [cartItems, hasLoadedCart]);

  const cartLines = useMemo(
    () =>
      Object.values(cartItems)
        .filter((item) => item.quantity > 0)
        .map((item) => ({
          ...item,
          lineTotal: item.priceValue * item.quantity,
        })),
    [cartItems],
  );

  const cartCount = cartLines.reduce((total, item) => total + item.quantity, 0);
  const cartTotal = cartLines.reduce((total, item) => total + item.lineTotal, 0);

  const addItem = (item: CartMenuItem) => {
    setCartItems((current) => ({
      ...current,
      [item.name]: {
        ...item,
        quantity: (current[item.name]?.quantity ?? 0) + 1,
      },
    }));
    setIsCartOpen(true);
  };

  const addToCart = (item: CartMenuItem) => {
    requireCustomerAuth(() => addItem(item));
  };

  const increaseQuantity = (itemName: string) => {
    setCartItems((current) => {
      const item = current[itemName];

      if (!item) {
        return current;
      }

      return {
        ...current,
        [itemName]: {
          ...item,
          quantity: item.quantity + 1,
        },
      };
    });
  };

  const decreaseQuantity = (itemName: string) => {
    setCartItems((current) => {
      const item = current[itemName];

      if (!item) {
        return current;
      }

      const nextCart = { ...current };

      if (item.quantity <= 1) {
        delete nextCart[itemName];
      } else {
        nextCart[itemName] = {
          ...item,
          quantity: item.quantity - 1,
        };
      }

      return nextCart;
    });
  };

  const removeFromCart = (itemName: string) => {
    setCartItems((current) => {
      const nextCart = { ...current };
      delete nextCart[itemName];
      return nextCart;
    });
  };

  const clearCart = () => setCartItems({});

  const getItemQuantity = (itemName: string) => cartItems[itemName]?.quantity ?? 0;

  const value = {
    cartLines,
    cartCount,
    cartTotal,
    isCartOpen,
    addToCart,
    removeFromCart,
    increaseQuantity,
    decreaseQuantity,
    clearCart,
    openCart: () => setIsCartOpen(true),
    closeCart: () => setIsCartOpen(false),
    getItemQuantity,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error("useCart must be used within CartProvider");
  }

  return context;
}

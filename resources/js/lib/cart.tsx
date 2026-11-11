import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { cartApi, type Cart } from "@/lib/api";
import { useAuth } from "@/lib/auth";

type CartContextValue = {
  cart: Cart | null;
  loading: boolean;
  refresh: () => Promise<void>;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    if (!user) {
      setCart(null);
      setLoading(false);
      return;
    }
    try {
      setCart(await cartApi.get());
    } catch {
      setCart(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  return (
    <CartContext.Provider value={{ cart, loading, refresh }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}

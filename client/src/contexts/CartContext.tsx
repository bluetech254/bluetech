import React, { createContext, useState, useEffect, ReactNode, useContext, useMemo } from 'react';
import { Product, CartItem } from '../types';
import toast from 'react-hot-toast';

interface CartContextType {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  addItem: (product: Product, quantity: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  isCartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Initialize from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem('bluetech_cart');
    if (savedCart) {
      try {
        setItems(JSON.parse(savedCart));
      } catch {
        // ignore
      }
    }
  }, []);

  // Save to localStorage when items change
  const saveCart = (newItems: CartItem[]) => {
    setItems(newItems);
    localStorage.setItem('bluetech_cart', JSON.stringify(newItems));
  };

  const addItem = (product: Product, quantity: number) => {
    const existingIndex = items.findIndex(item => item.product.id === product.id);
    let newItems = [...items];

    if (existingIndex > -1) {
      const currentQty = newItems[existingIndex].quantity;
      const targetQty = currentQty + quantity;
      
      if (targetQty > product.stock_quantity) {
        toast.error(`Cannot add more. Only ${product.stock_quantity} available in stock.`);
        newItems[existingIndex].quantity = product.stock_quantity;
      } else {
        newItems[existingIndex].quantity = targetQty;
        toast.success(`Updated ${product.name} quantity in cart!`);
      }
    } else {
      if (quantity > product.stock_quantity) {
        toast.error(`Cannot add. Only ${product.stock_quantity} available in stock.`);
        return;
      }
      newItems.push({ product, quantity });
      toast.success(`Added ${product.name} to cart!`);
    }

    saveCart(newItems);
  };

  const removeItem = (productId: string) => {
    const itemToRemove = items.find(item => item.product.id === productId);
    const newItems = items.filter(item => item.product.id !== productId);
    saveCart(newItems);
    if (itemToRemove) {
      toast.success(`Removed ${itemToRemove.product.name} from cart.`);
    }
  };

  const updateQuantity = (productId: string, quantity: number) => {
    const newItems = items.map(item => {
      if (item.product.id === productId) {
        if (quantity > item.product.stock_quantity) {
          toast.error(`Only ${item.product.stock_quantity} items available in stock.`);
          return { ...item, quantity: item.product.stock_quantity };
        }
        if (quantity < 1) {
          return { ...item, quantity: 1 };
        }
        return { ...item, quantity };
      }
      return item;
    });
    saveCart(newItems);
  };

  const clearCart = () => {
    saveCart([]);
  };

  const openCart = () => setIsCartOpen(true);
  const closeCart = () => setIsCartOpen(false);

  const itemCount = useMemo(() => {
    return items.reduce((total, item) => total + item.quantity, 0);
  }, [items]);

  const subtotal = useMemo(() => {
    return items.reduce((total, item) => total + (item.product.price * item.quantity), 0);
  }, [items]);

  return (
    <CartContext.Provider value={{
      items,
      itemCount,
      subtotal,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
      isCartOpen,
      openCart,
      closeCart
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCartContext = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCartContext must be used within a CartProvider');
  }
  return context;
};

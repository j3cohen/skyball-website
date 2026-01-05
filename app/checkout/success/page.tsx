// app/checkout/success/page.tsx
"use client";

import { useEffect } from "react";
import Link from "next/link";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { Button } from "@/components/ui/button";
import { useCart } from "@/components/cart-provider";

export default function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: { session_id?: string };
}) {
  const sessionId = searchParams?.session_id;
  const { clearCart } = useCart();

  // ✅ Clear cart ONLY after confirmed Stripe redirect
  useEffect(() => {
    if (sessionId) {
      clearCart();
    }
  }, [sessionId, clearCart]);

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gray-50 py-24">
        <div className="container mx-auto px-4 max-w-2xl">
          <div className="bg-white rounded-xl shadow p-8">
            <h1 className="text-3xl font-bold">Payment successful</h1>
            <p className="text-gray-700 mt-3">
              Thank you! We’ve received your order.
            </p>
            <p className="text-gray-700 mt-2">
              You will receive an email receipt shortly. Another email will be sent with tracking information
              when your order ships.
            </p>
            <p className="text-gray-700 mt-2">See you on the court!</p>

            {sessionId ? (
              <p className="text-sm text-gray-500 mt-3 break-all">
                Order reference: {sessionId}
              </p>
            ) : null}

            <div className="mt-6 flex gap-3">
              <Link href="/shop">
                <Button variant="outline">Continue shopping</Button>
              </Link>
              <Link href="/cart">
                <Button>View cart</Button>
              </Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

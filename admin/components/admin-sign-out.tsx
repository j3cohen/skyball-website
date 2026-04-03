"use client";

import { useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function AdminSignOut() {
  const router   = useRouter();
  const supabase = createClientComponentClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleSignOut}
      className="w-full rounded-md px-3 py-1.5 text-xs text-gray-400
                 hover:bg-gray-800 hover:text-white transition-colors text-left"
    >
      Sign out
    </button>
  );
}

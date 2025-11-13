"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function BackBtn() {
  const [showConfirm, setShowConfirm] = useState(false);
  const router = useRouter();

  const handleBackClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowConfirm(true);
  };

  const confirmBack = () => {
    router.push("/controller");
  };

  const cancelBack = () => {
    setShowConfirm(false);
  };

  return (
    <>
      <button onClick={handleBackClick}>
        <Image src="/icons/back.svg" alt="Back" width={16} height={16} />
      </button>

      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-3xl p-8 max-w-sm shadow-2xl">
            <h2 className="text-2xl font-bold mb-4 text-black">
              体験を終了しますか?
            </h2>
            <p className="text-gray-800 mb-6">
              体験を終了すると、現在の進行状況は保存されません。
            </p>
            <div className="flex gap-4">
              <button
                onClick={cancelBack}
                className="flex-1 px-6 py-3 bg-gray-300 text-black rounded-full font-semibold"
              >
                キャンセル
              </button>
              <button
                onClick={confirmBack}
                className="flex-1 px-6 py-3 bg-theme-yellow text-black rounded-full font-semibold"
              >
                終了
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
import Link from "next/link";
import Image from "next/image";

export default function BackBtn() {
  return (
    <Link href="/controller">
      <button>
        <Image src="/icons/back.svg" alt="Back" width={16} height={16} />
      </button>
    </Link>
  );
}

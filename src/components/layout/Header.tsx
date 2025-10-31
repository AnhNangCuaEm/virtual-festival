import Image from "next/image";

export default function Header() {
    return (
        <header className="mx-auto my-2">
            <Image src="/logo.svg" alt="Logo" width={150} height={100} />
        </header>
    );
}
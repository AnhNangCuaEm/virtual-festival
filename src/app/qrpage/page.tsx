import Image from "next/image";
import Link from "next/link";

export default function QRPage() {
    return (
        <div className="min-h-screen flex flex-col backdrop-blur-sm">
            <main className="container flex flex-col justify-center mx-auto px-4 py-8 flex-1">
                <div className="flex justify-center gap-64">
                    <div>
                        <Link href="\">
                            <h1 className="text-6xl text-center font-bold mb-8">Step 1.</h1>
                        </Link>
                        <Image
                            src="/qr/sample_wifi_qr.png"
                            alt="Step 1"
                            width={400}
                            height={200}
                            className="mb-4"
                        />
                        <p className="text-2xl text-center">Scan to connect to Wi-Fi</p>
                    </div>
                    <div>
                        <h1 className="text-6xl text-center font-bold mb-8">Step 2.</h1>
                        <Image
                            src="/qr/sample_ctl_qr.png"
                            alt="Step 2"
                            width={400}
                            height={200}
                            className="mb-4"
                        />
                        <p className="text-2xl text-center">Scan to enjoy festival</p>
                    </div>
                </div>
            </main>
            <footer className="text-center mb-2">
                <p>Virtual Festival. &copy; {new Date().getFullYear()} All rights reserved.</p>
            </footer>
        </div>
    );
}
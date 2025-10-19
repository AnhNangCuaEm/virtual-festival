import Image from "next/image";

export default function QRPage() {
    return (
        <div className="container">
            <h1>Welcome to the Virtual Festival</h1>
            <p>Scan the QR code below to get started!</p>
            <Image src="/sample-qr.png"
                width={200}
                height={200}
                alt="Sample QR Code" className="qr-code" />
        </div>
    );
}
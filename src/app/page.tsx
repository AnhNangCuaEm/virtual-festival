import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <main className="container mx-auto px-4 py-8 flex-1">
        <h1 className="text-center text-6xl font-bold">Virtual Festival</h1>
        <div className="flex justify-center gap-10 mt-12">
          <Link
            href="/dashboard"
            className="block mt-8 text-center text-2xl bg-white text-gray-800 px-6 py-3 rounded-lg shadow-md hover:bg-blue-100 hover:shadow-lg"
          >
            Dashboard
          </Link>
          <Link
            href="/qrpage"
            className="block mt-8 text-center text-2xl bg-white text-gray-800 px-6 py-3 rounded-lg shadow-md hover:bg-blue-100 hover:shadow-lg"
          >
            QR Page
          </Link>
          <Link
            href="/venue"
            className="block mt-8 text-center text-2xl bg-white text-gray-800 px-6 py-3 rounded-lg shadow-md hover:bg-blue-100 hover:shadow-lg"
          >
            Venue
          </Link>
        </div>
      </main>
      <footer className="text-center">
        <p>Virtual Festival. &copy; {new Date().getFullYear()} All rights reserved.</p>
      </footer>
    </div>
  );
}

import Link from "next/link";

export default function NotFound() {
  return (
    <html lang="en">
      <body className="flex min-h-screen items-center justify-center p-6">
        <div className="text-center">
          <p className="text-lg font-medium">404</p>
          <Link href="/tr" className="mt-2 inline-block text-primary underline">
            /tr
          </Link>
        </div>
      </body>
    </html>
  );
}

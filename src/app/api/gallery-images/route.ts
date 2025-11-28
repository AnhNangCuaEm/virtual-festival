import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  try {
    const imagesDir = path.join(process.cwd(), "public/images/zone_1");
    
    // Check if directory exists
    if (!fs.existsSync(imagesDir)) {
      return NextResponse.json({ images: [] });
    }

    // Read all files in the directory
    const files = fs.readdirSync(imagesDir);
    
    // Filter only image files (jpg, jpeg, png, webp, gif)
    const imageExtensions = [".jpg", ".jpeg", ".png", ".webp", ".gif"];
    const images = files
      .filter((file) => {
        const ext = path.extname(file).toLowerCase();
        return imageExtensions.includes(ext);
      })
      .sort((a, b) => {
        // Sort numerically if filenames are numbers
        const numA = parseInt(a.replace(/\D/g, "")) || 0;
        const numB = parseInt(b.replace(/\D/g, "")) || 0;
        return numA - numB;
      })
      .map((file) => `/images/zone_1/${file}`);

    return NextResponse.json({ images });
  } catch (error) {
    console.error("Error reading gallery images:", error);
    return NextResponse.json({ images: [] }, { status: 500 });
  }
}

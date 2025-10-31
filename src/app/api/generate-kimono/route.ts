import { NextRequest, NextResponse } from 'next/server';
import OpenAI, { toFile } from 'openai';
import fs from 'fs';
import path from 'path';
import { Buffer } from 'buffer';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  let tempFilePath = '';
  
  try {
    const { imageBase64, style } = await request.json();

    if (!imageBase64 || !style) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: imageBase64 and style' },
        { status: 400 }
      );
    }

    console.log('[KIMONO] Received request for style:', style);
    console.log('[KIMONO] API Key present:', !!process.env.OPENAI_API_KEY);
    console.log('[KIMONO] Base64 size:', (imageBase64.length / 1024).toFixed(2), 'KB');

    // Convert base64 to buffer
    const inputImageBuffer = Buffer.from(imageBase64, 'base64');
    console.log('[KIMONO] Image buffer size:', inputImageBuffer.length, 'bytes');

    // Create temporary directory
    const tempDir = path.join(process.cwd(), 'tmp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
      console.log('[KIMONO] Created temp directory:', tempDir);
    }
    
    // Save temp file
    tempFilePath = path.join(tempDir, `temp-image-${Date.now()}.png`);
    fs.writeFileSync(tempFilePath, inputImageBuffer);
    console.log('[KIMONO] Temp file created:', tempFilePath);

    // Style-specific prompts for gpt-image-1 edit mode
    const stylePrompts: Record<string, string> = {
      'Anime': 'Create a portrait of this person wearing a vibrant traditional Japanese festival yukata kimono with colorful anime-style patterns. Apply anime art style only to the kimono and background while preserving the person\'s face and facial features exactly as they are. Add a beautiful festival background with lanterns.',

      'Art': 'Create a portrait of this person wearing an elegant traditional Japanese kimono with intricate artistic patterns. Apply Ukiyo-e woodblock art style to the kimono and background while keeping the person\'s face completely unchanged. Add a serene festival background with cherry blossoms.',

      'Fantasy': 'Create a portrait of this person wearing a magical fantasy-style Japanese kimono with ethereal patterns and glowing accents. Apply fantasy art style to the clothing and surroundings while keeping the person\'s face exactly as it appears. Add a mystical festival background with floating lanterns.',

      'Ghibli': 'Create a portrait of this person wearing a beautiful traditional Japanese festival kimono with charming patterns. Apply Studio Ghibli watercolor art style to the kimono and background while preserving the person\'s face. Add a nostalgic festival background with paper lanterns.'
    };

    const prompt = stylePrompts[style] || stylePrompts['Anime'];
    console.log('[KIMONO] Using prompt for style:', style);

    // Convert file to FormData for multipart upload
    console.log('[KIMONO] Converting image to file for upload...');
    const imageFile = await toFile(
      fs.createReadStream(tempFilePath),
      'image.png',
      { type: 'image/png' }
    );

    // Call gpt-image-1 edit API
    console.log('[KIMONO] Calling gpt-image-1 edit API...');
    console.log('[KIMONO] Model: gpt-image-1');
    console.log('[KIMONO] Size: 1024x1024');
    console.log('[KIMONO] Quality: high');
    console.log('[KIMONO] Input fidelity: high');
    
    const editResponse = await openai.images.edit({
      model: 'gpt-image-1',
      image: imageFile,
      prompt: prompt,
      n: 1,
      input_fidelity: 'high',
      size: '1024x1536',
      quality: 'high'
    });

    console.log('[KIMONO] Edit API response received');
    console.log('[KIMONO] Response status: OK');
    console.log('[KIMONO] Full response:', JSON.stringify(editResponse, null, 2));
    console.log('[KIMONO] Response keys:', Object.keys(editResponse));
    console.log('[KIMONO] Response.data:', editResponse.data);
    console.log('[KIMONO] Response.data type:', typeof editResponse.data);

    let imageBuffer: Buffer | null = null;
    
    // Cách 1: Nếu có URL (trường hợp thường)
    const generatedImageUrl = editResponse.data?.[0]?.url;
    
    // Cách 2: Nếu có b64_json (trường hợp streaming hoặc response format khác)
    const b64Json = editResponse.data?.[0]?.b64_json;

    if (generatedImageUrl) {
      console.log('[KIMONO] Found URL in response, downloading...');
      console.log('[KIMONO] Generated image URL:', generatedImageUrl);

      // Download image from URL
      console.log('[KIMONO] Downloading image from URL...');
      const imageResponseFetch = await fetch(generatedImageUrl);
      
      if (!imageResponseFetch.ok) {
        console.error('[KIMONO] ERROR: Failed to fetch image:', imageResponseFetch.statusText);
        fs.unlinkSync(tempFilePath);
        return NextResponse.json(
          { success: false, error: `Failed to download image: ${imageResponseFetch.statusText}` },
          { status: 500 }
        );
      }
      
      const downloadedImageBuffer = await imageResponseFetch.arrayBuffer();
      console.log('[KIMONO] Image downloaded, size:', downloadedImageBuffer.byteLength, 'bytes');
      imageBuffer = Buffer.from(downloadedImageBuffer);
      
    } else if (b64Json) {
      console.log('[KIMONO] Found b64_json in response');
      imageBuffer = Buffer.from(b64Json, 'base64');
      console.log('[KIMONO] Decoded base64 image, size:', imageBuffer.length, 'bytes');
      
    } else {
      console.error('[KIMONO] ERROR: No URL or b64_json in response');
      console.error('[KIMONO] Full response:', JSON.stringify(editResponse, null, 2));
      fs.unlinkSync(tempFilePath);
      return NextResponse.json(
        { success: false, error: 'No image generated from gpt-image-1' },
        { status: 500 }
      );
    }

    // Save to public/images/zone_1/
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 8);
    const filename = `kimono-${style.toLowerCase()}-${timestamp}-${randomId}.png`;
    const filepath = path.join(process.cwd(), 'public', 'images', 'zone_1', filename);
    
    console.log('[KIMONO] Saving image to:', filepath);
    
    // Ensure directory exists
    const dir = path.dirname(filepath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log('[KIMONO] Created directory:', dir);
    }
    
    // Save image file
    if (!imageBuffer) {
      console.error('[KIMONO] ERROR: No image buffer to save');
      fs.unlinkSync(tempFilePath);
      return NextResponse.json(
        { success: false, error: 'Failed to get image buffer' },
        { status: 500 }
      );
    }
    
    fs.writeFileSync(filepath, imageBuffer);
    console.log('[KIMONO] Image saved successfully');
    
    // Clean up temp file
    try {
      fs.unlinkSync(tempFilePath);
      console.log('[KIMONO] Temp file deleted');
    } catch (e) {
      console.error('[KIMONO] Error deleting temp file:', e);
    }
    
    // Return local URL path
    const imageUrl = `/images/zone_1/${filename}`;
    console.log('[KIMONO] Returning image URL:', imageUrl);

    return NextResponse.json({
      success: true,
      imageUrl: imageUrl,
      style: style,
      timestamp: timestamp
    });

  } catch (error: unknown) {
    console.error('[KIMONO] ERROR:', error);
    
    if (error instanceof Error) {
      console.error('[KIMONO] Error message:', error.message);
      console.error('[KIMONO] Error stack:', error.stack);
    }
    
    let errorMessage = 'Failed to generate image';
    let statusCode = 500;
    
    // Kiểm tra nếu là OpenAI API error
    if (error && typeof error === 'object') {
      const errorObj = error as Record<string, unknown>;
      console.error('[KIMONO] Error object:', JSON.stringify(errorObj, null, 2));
      
      if (typeof errorObj.status === 'number') {
        statusCode = errorObj.status;
        console.error('[KIMONO] API Status:', errorObj.status);
      }
      
      const errorData = errorObj.error as Record<string, string> | undefined;
      if (errorData?.message) {
        errorMessage = errorData.message;
        console.error('[KIMONO] API Error Message:', errorData.message);
      }
      
      if (typeof errorObj.message === 'string') {
        errorMessage = errorObj.message;
      }
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    // Clean up temp file if still exists
    try {
      if (tempFilePath && fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
        console.log('[KIMONO] Temp file cleaned up after error');
      }
    } catch (e) {
      console.error('[KIMONO] Error deleting temp file after error:', e);
    }

    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage
      },
      { status: statusCode }
    );
  }
}

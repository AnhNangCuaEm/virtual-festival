import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'sk-proj-PLACEHOLDER',
});

export async function POST(request: NextRequest) {
  try {
    const { imageBase64, style } = await request.json();

    if (!imageBase64 || !style) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Analyze the person's face using GPT-4 Vision
    const visionResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Describe only this person's facial features in detail: face shape, eyes, nose, mouth, skin tone, hair color and style, age, gender, expression. Be specific and detailed for recreating this exact face."
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`
              }
            }
          ]
        }
      ],
      max_tokens: 300
    });

    const faceDescription = visionResponse.choices[0].message.content;

    // Enhanced prompts with face preservation focus
    const stylePrompts: Record<string, string> = {
      'Anime': `Photorealistic portrait of a real person with EXACT facial features: ${faceDescription}.

The person is wearing a vibrant traditional Japanese festival yukata kimono with colorful patterns.
Anime art style applied ONLY to the kimono and background - face remains completely photorealistic.
Festival background with lanterns and stalls. The face shape, eyes, nose, mouth, skin tone, and hair must be identical to the description.`,

      'Art': `Photorealistic portrait of a real person with EXACT facial features: ${faceDescription}.

The person is wearing an elegant traditional Japanese kimono with intricate patterns.
Ukiyo-e woodblock art style applied ONLY to the kimono and background - face remains completely photorealistic.
Serene festival background with cherry blossoms. The face shape, eyes, nose, mouth, skin tone, and hair must be identical to the description.`,

      'Fantasy': `Photorealistic portrait of a real person with EXACT facial features: ${faceDescription}.

The person is wearing a magical fantasy-style Japanese kimono with ethereal patterns and glowing accents.
Fantasy art style applied ONLY to the kimono and background - face remains completely photorealistic.
Mystical festival background with floating lanterns. The face shape, eyes, nose, mouth, skin tone, and hair must be identical to the description.`,

      'Ghibli': `Photorealistic portrait of a real person with EXACT facial features: ${faceDescription}.

The person is wearing a beautiful traditional Japanese festival kimono with charming patterns.
Studio Ghibli watercolor style applied ONLY to the kimono and background - face remains completely photorealistic.
Nostalgic festival background with paper lanterns. The face shape, eyes, nose, mouth, skin tone, and hair must be identical to the description.`
    };

    const fullPrompt = stylePrompts[style] || stylePrompts['Anime'];

    // Generate kimono image using DALL-E 3 with enhanced settings
    const imageResponse = await openai.images.generate({
      model: "dall-e-3",
      prompt: fullPrompt,
      n: 1,
      size: "1024x1792", // Portrait aspect ratio
      quality: "hd",
      style: "natural" // More photorealistic results
    });

    const generatedImageUrl = imageResponse.data?.[0]?.url;

    if (!generatedImageUrl) {
      return NextResponse.json(
        { success: false, error: 'No image generated' },
        { status: 500 }
      );
    }    // Download and save image locally
    const imageResponseFetch = await fetch(generatedImageUrl as string);
    const downloadedImageBuffer = await imageResponseFetch.arrayBuffer();
    
    // Generate unique filename
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 8);
    const filename = `kimono-${style.toLowerCase()}-${timestamp}-${randomId}.png`;
    const filepath = path.join(process.cwd(), 'public', 'images', 'zone_1', filename);
    
    // Ensure directory exists
    const dir = path.dirname(filepath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Save image
    fs.writeFileSync(filepath, Buffer.from(downloadedImageBuffer));
    
    // Return local path
    const imageUrl = `/images/zone_1/${filename}`;

    return NextResponse.json({
      success: true,
      imageUrl: imageUrl,
    });

  } catch (error: unknown) {
    console.error('OpenAI API Error:', error);
    
    let errorMessage = 'Failed to generate image';
    
    if (error && typeof error === 'object' && 'error' in error) {
      const apiError = error as { error?: { message?: string } };
      if (apiError.error?.message) {
        errorMessage = apiError.error.message;
      }
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

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

    // Style-specific prompts with enhanced face preservation
    const stylePrompts: Record<string, string> = {
      'Anime': `MANDATORY: Recreate the EXACT facial features from this description with PHOTOREALISTIC accuracy. DO NOT create a generic anime character.

Photorealistic anime portrait of a real person with these PRECISE facial features: ${faceDescription}.

The subject has these exact physical characteristics that MUST be preserved:
- Face shape, eye shape, nose shape, mouth shape
- Exact skin tone, hair color, and hairstyle
- Age and gender expression

Apply anime art style (bold lines, vibrant colors, expressive features) to this SPECIFIC person's face and body. The person is wearing a traditional Japanese festival yukata with colorful patterns.

Festival background with lanterns and stalls. The facial features must be photorealistically accurate to the description - no generic anime face.`,

      'Art': `MANDATORY: Recreate the EXACT facial features from this description with PHOTOREALISTIC accuracy. DO NOT create a generic character.

Photorealistic ukiyo-e portrait of a real person with these PRECISE facial features: ${faceDescription}.

The subject has these exact physical characteristics that MUST be preserved:
- Face shape, eye shape, nose shape, mouth shape
- Exact skin tone, hair color, and hairstyle
- Age and gender expression

Apply traditional Japanese ukiyo-e woodblock art style to this SPECIFIC person's face and body. The person is wearing an elegant traditional Japanese kimono with intricate patterns.

Serene festival background with cherry blossoms and architecture. The facial features must be photorealistically accurate to the description.`,

      'Fantasy': `MANDATORY: Recreate the EXACT facial features from this description with PHOTOREALISTIC accuracy. DO NOT create a generic fantasy character.

Photorealistic fantasy portrait of a real person with these PRECISE facial features: ${faceDescription}.

The subject has these exact physical characteristics that MUST be preserved:
- Face shape, eye shape, nose shape, mouth shape
- Exact skin tone, hair color, and hairstyle
- Age and gender expression

Apply fantasy art style (magical elements, soft lighting) to this SPECIFIC person's face and body. The person is wearing a magical Japanese kimono with ethereal patterns and glowing accents.

Mystical festival background with floating lanterns and cherry blossoms. The facial features must be photorealistically accurate to the description.`,

      'Ghibli': `MANDATORY: Recreate the EXACT facial features from this description with PHOTOREALISTIC accuracy. DO NOT create a generic Ghibli character.

Photorealistic Studio Ghibli portrait of a real person with these PRECISE facial features: ${faceDescription}.

The subject has these exact physical characteristics that MUST be preserved:
- Face shape, eye shape, nose shape, mouth shape
- Exact skin tone, hair color, and hairstyle
- Age and gender expression

Apply authentic Studio Ghibli animation style (watercolor textures, gentle shading, expressive eyes) to this SPECIFIC person's face and body. The person is wearing a traditional Japanese festival kimono with charming patterns.

Nostalgic festival background with paper lanterns and wooden stalls. The facial features must be photorealistically accurate to the description - authentic Ghibli style but with the exact real person's face.`
    };

    const fullPrompt = stylePrompts[style] || stylePrompts['Anime'];

    // Generate kimono image using DALL-E 3
    const imageResponse = await openai.images.generate({
      model: "dall-e-3",
      prompt: fullPrompt,
      n: 1,
      size: "1024x1792", // Portrait aspect ratio
      quality: "hd",
    });

    const generatedImageUrl = imageResponse.data?.[0]?.url;

    if (!generatedImageUrl) {
      return NextResponse.json(
        { success: false, error: 'No image generated' },
        { status: 500 }
      );
    }

    // Download and save image locally
    const imageResponseFetch = await fetch(generatedImageUrl);
    const imageBuffer = await imageResponseFetch.arrayBuffer();
    
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
    fs.writeFileSync(filepath, Buffer.from(imageBuffer));
    
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

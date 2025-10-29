import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

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

    // Style-specific prompts
    const stylePrompts: Record<string, string> = {
      'Anime': `CRITICAL: Use EXACTLY this person's facial features: ${faceDescription}. Do not create a generic anime character - recreate this specific person's face with anime styling.

A highly detailed anime-style portrait of THIS SPECIFIC PERSON with these exact facial features: ${faceDescription}.
The person is wearing a vibrant traditional Japanese festival kimono (yukata) with colorful patterns.
Apply anime art style (bold colors, clean lines, expressive eyes) WHILE PRESERVING the exact face shape, eye shape, nose, mouth, skin tone, hair color and age from the description above.
Background: lively Japanese summer festival (matsuri) with lanterns, food stalls, and festival decorations.
The face must match the description exactly - same eye shape, same nose, same mouth, same expression. Professional anime illustration maintaining photorealistic facial accuracy.`,

      'Art': `CRITICAL: Use EXACTLY this person's facial features: ${faceDescription}. Do not create a generic character - recreate this specific person's face in ukiyo-e style.

A highly detailed ukiyo-e woodblock print portrait of THIS SPECIFIC PERSON with these exact facial features: ${faceDescription}.
The person is wearing an elegant traditional Japanese kimono with intricate patterns.
Apply traditional Japanese ukiyo-e art style (refined colors, artistic composition) WHILE PRESERVING the exact face shape, eye shape, nose, mouth, skin tone, hair color and age from the description above.
Background: serene Japanese festival scene with cherry blossoms, traditional architecture, and soft lighting.
The face must match the description exactly - same eye shape, same nose, same mouth, same expression. Artistic, elegant, timeless aesthetic with photorealistic facial accuracy.`,

      'Fantasy': `CRITICAL: Use EXACTLY this person's facial features: ${faceDescription}. Do not create a generic fantasy character - recreate this specific person's face with fantasy elements.

A highly detailed fantasy art portrait of THIS SPECIFIC PERSON with these exact facial features: ${faceDescription}.
The person is wearing a magical fantasy-style Japanese kimono with ethereal patterns and glowing accents.
Apply fantasy art style (dreamy atmosphere, soft magical lighting, enchanted elements) WHILE PRESERVING the exact face shape, eye shape, nose, mouth, skin tone, hair color and age from the description above.
Background: mystical Japanese festival with floating lanterns, cherry blossom petals in the air, and magical ambiance.
The face must match the description exactly - same eye shape, same nose, same mouth, same expression. Whimsical, dreamlike, fantasy aesthetic with photorealistic facial accuracy.`,

      'Ghibli': `CRITICAL: Use EXACTLY this person's facial features: ${faceDescription}. Do not create a generic Ghibli character - recreate this specific person's face in Studio Ghibli style.

A highly detailed Studio Ghibli style portrait of THIS SPECIFIC PERSON with these exact facial features: ${faceDescription}.
The person is wearing a beautiful traditional Japanese festival kimono with charming, hand-drawn patterns.
Apply authentic Studio Ghibli animation style (soft watercolor-like colors, gentle shading, expressive large eyes, warm nostalgic atmosphere) WHILE PRESERVING the exact face shape, eye shape, nose, mouth, skin tone, hair color and age from the description above.
Background: traditional Japanese summer festival with paper lanterns, wooden food stalls, and soft evening lighting.
The face must match the description exactly - same eye shape, same nose, same mouth, same expression. Pure Ghibli aesthetic like My Neighbor Totoro or Spirited Away with photorealistic facial accuracy.`
    };

    const fullPrompt = stylePrompts[style] || stylePrompts['Anime'];

    // Generate kimono image using DALL-E 3
    const imageResponse = await openai.images.generate({
      model: "dall-e-3",
      prompt: fullPrompt,
      n: 1,
      size: "1024x1024",
      quality: "hd",
    });

    const generatedImageUrl = imageResponse.data?.[0]?.url;

    if (!generatedImageUrl) {
      return NextResponse.json(
        { success: false, error: 'No image generated' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      imageUrl: generatedImageUrl,
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

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
      'Anime': `A portrait of a person with this face: ${faceDescription}. 
The person is wearing a vibrant traditional Japanese festival kimono (yukata) with colorful patterns.
Anime art style with bold colors, clean lines, and expressive eyes.
Background: lively Japanese summer festival (matsuri) with lanterns, food stalls, and festival decorations.
Focus on the person and their beautiful kimono. Professional anime illustration style.`,

      'Art': `A portrait of a person with this face: ${faceDescription}.
The person is wearing an elegant traditional Japanese kimono with intricate patterns.
Traditional Japanese ukiyo-e woodblock print art style with refined colors and artistic composition.
Background: serene Japanese festival scene with cherry blossoms, traditional architecture, and soft lighting.
Focus on the person in their exquisite kimono. Artistic, elegant, timeless aesthetic.`,

      'fantasy': `A portrait of a person with this face: ${faceDescription}.
The person is wearing a magical fantasy-style Japanese kimono with ethereal patterns and glowing accents.
Fantasy art style with dreamy atmosphere, soft magical lighting, and enchanted elements.
Background: mystical Japanese festival with floating lanterns, cherry blossom petals in the air, and magical ambiance.
Focus on the person in their enchanted kimono. Whimsical, dreamlike, fantasy aesthetic.`,

      'ghibli': `A portrait of a person with this face: ${faceDescription}.
The person is wearing a beautiful traditional Japanese festival kimono with charming patterns.
Studio Ghibli animation style with warm colors, soft shading, and heartwarming atmosphere.
Background: nostalgic Japanese summer festival scene with paper lanterns, wooden stalls, and gentle evening sky.
Focus on the person in their lovely kimono. Ghibli-style warmth, detail, and emotion.`
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

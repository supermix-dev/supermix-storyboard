import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const apiKey = process.env.FAL_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'FAL_API_KEY not configured' },
        { status: 500 }
      );
    }

    const response = await fetch('https://rest.alpha.fal.ai/billing/balance', {
      headers: {
        Authorization: `Key ${apiKey}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to fetch fal balance:', errorText);
      return NextResponse.json(
        { error: 'Failed to fetch balance' },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json({
      balance: data.balance ?? data.credits ?? 0,
    });
  } catch (error) {
    console.error('Error fetching fal balance:', error);
    return NextResponse.json(
      { error: 'Failed to fetch balance' },
      { status: 500 }
    );
  }
}

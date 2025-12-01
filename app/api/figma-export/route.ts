import { NextRequest, NextResponse } from 'next/server';

import { saveExport, FigmaExportPayload } from '@/lib/figma-export-store';

function getBaseUrl(request: NextRequest): string {
  const host = request.headers.get('host') || 'localhost:3000';
  const protocol = host.includes('localhost') ? 'http' : 'https';
  return `${protocol}://${host}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }

    if (!Array.isArray(body.storyboards) || body.storyboards.length === 0) {
      return NextResponse.json(
        { error: 'Export must include at least one storyboard' },
        { status: 400 }
      );
    }

    const payload: FigmaExportPayload = {
      meta: body.meta || {
        generatedAt: new Date().toISOString(),
        totalStoryboards: body.storyboards.length,
        transcriptIncluded: Boolean(body.transcript),
      },
      storyboards: body.storyboards,
      transcript: body.transcript,
    };

    const result = await saveExport(payload);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    const baseUrl = getBaseUrl(request);
    const exportUrl = `${baseUrl}/api/figma-export/${result.id}`;

    return NextResponse.json({
      id: result.id,
      url: exportUrl,
      expiresIn: '24 hours',
    });
  } catch (error) {
    console.error('Error creating Figma export:', error);
    return NextResponse.json(
      { error: 'Failed to create export' },
      { status: 500 }
    );
  }
}


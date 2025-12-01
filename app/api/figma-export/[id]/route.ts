import { NextRequest, NextResponse } from 'next/server';

import { getExport } from '@/lib/figma-export-store';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json(
      { error: 'Export ID is required' },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  const result = await getExport(id);

  if (!result.success) {
    return NextResponse.json(
      { error: result.error },
      { status: 404, headers: CORS_HEADERS }
    );
  }

  return NextResponse.json(result.payload, {
    headers: CORS_HEADERS,
  });
}


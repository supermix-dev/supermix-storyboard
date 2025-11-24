import JSZip from 'jszip';
import { NextResponse } from 'next/server';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { enforceRateLimit, type RateLimitCheckResult } from '@/lib/rate-limit';

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 20;
const RATE_LIMIT_NAMESPACE = 'figma-plugin-download';

export async function GET(request: Request) {
  try {
    const identifier = getClientIdentifier(request);
    const rateLimitResult = await enforceRateLimit({
      identifier,
      maxRequests: RATE_LIMIT_MAX_REQUESTS,
      windowMs: RATE_LIMIT_WINDOW_MS,
      namespace: RATE_LIMIT_NAMESPACE,
    });

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many requests. Try again in a minute.' },
        {
          status: 429,
          headers: buildRateLimitHeaders(rateLimitResult),
        }
      );
    }

    const projectRoot = process.cwd();
    const manifestPath = path.join(
      projectRoot,
      'figma-plugin',
      'manifest.json'
    );
    const codePath = path.join(projectRoot, 'figma-plugin', 'code.js');

    const [manifestContent, codeContent] = await Promise.all([
      readFile(manifestPath, 'utf-8'),
      readFile(codePath, 'utf-8'),
    ]);

    const zip = new JSZip();
    zip.file('manifest.json', manifestContent);
    zip.file('code.js', codeContent);

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
    const zipArray = new Uint8Array(zipBuffer);
    const zipBlob = new Blob([zipArray.buffer], { type: 'application/zip' });

    const headers = {
      ...buildRateLimitHeaders(rateLimitResult),
      'Content-Type': 'application/zip',
      'Content-Disposition': 'attachment; filename="supermix-figma-plugin.zip"',
    } as Record<string, string>;

    return new NextResponse(zipBlob, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error('Failed to prepare figma plugin download', error);
    return NextResponse.json(
      { error: 'Unable to download figma plugin bundle' },
      { status: 500 }
    );
  }
}

function getClientIdentifier(request: Request) {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    const ip = forwardedFor.split(',')[0]?.trim();
    if (ip) {
      return ip;
    }
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp && realIp.trim().length > 0) {
    return realIp.trim();
  }

  return request.headers.get('cf-connecting-ip') || 'anonymous';
}

function buildRateLimitHeaders(result: RateLimitCheckResult) {
  const headers: Record<string, string> = {
    'X-RateLimit-Limit': String(result.metrics.limit),
    'X-RateLimit-Remaining': String(Math.max(0, result.metrics.remaining ?? 0)),
    'X-RateLimit-Reset': String(Math.ceil(result.metrics.reset / 1000)),
    'X-RateLimit-Mode': result.usingFallback ? 'fallback' : 'global',
  };

  if (!result.success) {
    const retryAfterSeconds = Math.max(
      0,
      Math.ceil((result.metrics.reset - Date.now()) / 1000)
    );
    headers['Retry-After'] = String(retryAfterSeconds);
  }

  return headers;
}

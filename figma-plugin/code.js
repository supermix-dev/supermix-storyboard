const HTML_TEMPLATE = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Supermix Storyboards Importer</title>
    <style>
      :root {
        font-family: "Inter", system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
        color: var(--figma-color-text, #111);
      }

      body {
        margin: 0;
        padding: 0;
        background: var(--figma-color-bg, #f5f5f5);
      }

      .container {
        padding: 20px;
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      h1 {
        font-size: 16px;
        margin: 0;
      }

      .section-label {
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        color: #666;
        margin-bottom: 6px;
      }

      .section {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .primary-section {
        background: rgba(0, 123, 255, 0.06);
        border: 1px solid rgba(0, 123, 255, 0.15);
        border-radius: 10px;
        padding: 14px;
      }

      .url-input-group {
        display: flex;
        gap: 8px;
      }

      input[type="text"] {
        flex: 1;
        border-radius: 6px;
        border: 1px solid var(--figma-color-border, #d0d0d0);
        padding: 10px 12px;
        font-size: 13px;
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      }

      input[type="text"]:focus {
        outline: 2px solid #007bff;
        outline-offset: -1px;
      }

      input[type="text"]::placeholder {
        color: #999;
        font-family: inherit;
      }

      textarea {
        resize: none;
        width: 100%;
        min-height: 120px;
        border-radius: 8px;
        border: 1px solid var(--figma-color-border, #d0d0d0);
        padding: 12px;
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
        font-size: 12px;
      }

      textarea:focus {
        outline: 2px solid #007bff;
      }

      button,
      label.button {
        border: none;
        border-radius: 6px;
        padding: 10px 14px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        transition: opacity 0.15s;
      }

      button:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }

      button.primary {
        background: #0061f2;
        color: #fff;
      }

      button.primary:hover:not(:disabled) {
        background: #0052cc;
      }

      button.secondary,
      label.button {
        background: #e4e7ec;
        color: #111;
      }

      button.secondary:hover:not(:disabled),
      label.button:hover {
        background: #d4d7dc;
      }

      button.full-width {
        width: 100%;
      }

      .divider {
        display: flex;
        align-items: center;
        gap: 12px;
        color: #999;
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .divider::before,
      .divider::after {
        content: "";
        flex: 1;
        height: 1px;
        background: var(--figma-color-border, #d0d0d0);
      }

      .status {
        font-size: 12px;
        min-height: 18px;
        padding: 8px 12px;
        border-radius: 6px;
        background: rgba(0, 0, 0, 0.03);
      }

      .status:empty {
        display: none;
      }

      .status[data-status="error"] {
        color: #d92d20;
        background: rgba(217, 45, 32, 0.08);
      }

      .status[data-status="success"] {
        color: #039855;
        background: rgba(3, 152, 85, 0.08);
      }

      .status[data-status="loading"] {
        color: #0061f2;
        background: rgba(0, 97, 242, 0.08);
      }

      .hint {
        font-size: 11px;
        color: #666;
        line-height: 1.4;
      }

      .manual-section {
        border-top: 1px solid var(--figma-color-border, #d0d0d0);
        padding-top: 16px;
      }

      .button-row {
        display: flex;
        gap: 8px;
      }

      .button-row > * {
        flex: 1;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div>
        <h1>Supermix Storyboards Importer</h1>
        <p class="hint">
          Paste a storyboard URL or shareable link from the Supermix app.
        </p>
      </div>

      <!-- Primary: URL Import -->
      <div class="section primary-section">
        <div class="section-label">Quick Import</div>
        <div class="url-input-group">
          <input
            type="text"
            id="urlInput"
            placeholder="Paste storyboard URL (e.g., supermix.app/abc123)"
          />
          <button class="primary" id="fetchUrl">Import</button>
        </div>
      </div>

      <div class="divider">or import manually</div>

      <!-- Secondary: Manual Import -->
      <div class="section manual-section">
        <textarea id="jsonInput" placeholder="Paste your storyboard export JSON here"></textarea>
        <div class="button-row">
          <button class="secondary" id="importJson">Import JSON</button>
          <label class="button secondary">
            <input type="file" id="fileInput" accept="application/json" style="display:none;" />
            Upload file
          </label>
        </div>
      </div>

      <div class="status" id="status" data-status="idle"></div>
    </div>

    <script>
      const statusEl = document.getElementById('status');
      const urlInput = document.getElementById('urlInput');
      const fetchUrlBtn = document.getElementById('fetchUrl');
      const jsonInput = document.getElementById('jsonInput');
      const importBtn = document.getElementById('importJson');
      const fileInput = document.getElementById('fileInput');

      function setStatus(message, status = 'idle') {
        statusEl.textContent = message || '';
        statusEl.dataset.status = status;
      }

      function sendPayload(payload) {
        parent.postMessage(
          { pluginMessage: { type: 'import-storyboards', payload } },
          '*'
        );
      }

      function parseInput(input) {
        const trimmed = input.trim();
        
        // Try to parse as a full URL first
        try {
          const url = new URL(trimmed);
          
          // Check for legacy export URL: /api/figma-export/{id}
          const exportMatch = url.pathname.match(/\\/api\\/figma-export\\/([a-zA-Z0-9]+)\\/?$/);
          if (exportMatch) {
            return { 
              type: 'export', 
              id: exportMatch[1], 
              baseUrl: url.origin 
            };
          }
          
          // Check for storyboard URL: /{id} (single path segment, alphanumeric with hyphens)
          const storyboardMatch = url.pathname.match(/^\\/([a-zA-Z0-9_-]+)\\/?$/);
          if (storyboardMatch) {
            return { 
              type: 'storyboard', 
              id: storyboardMatch[1], 
              baseUrl: url.origin 
            };
          }
          
          // Check for storyboard API URL: /api/storyboard/{id}
          const storyboardApiMatch = url.pathname.match(/\\/api\\/storyboard\\/([a-zA-Z0-9_-]+)\\/?$/);
          if (storyboardApiMatch) {
            return { 
              type: 'storyboard', 
              id: storyboardApiMatch[1], 
              baseUrl: url.origin 
            };
          }
        } catch (e) {
          // Not a valid URL, continue checking other patterns
        }
        
        // Check for relative URL patterns without protocol
        // Legacy export format: /api/figma-export/{id}
        const relativeExportMatch = trimmed.match(/^\\/?api\\/figma-export\\/([a-zA-Z0-9]+)\\/?$/);
        if (relativeExportMatch) {
          return { type: 'export', id: relativeExportMatch[1], baseUrl: null };
        }
        
        // Storyboard API format: /api/storyboard/{id}
        const relativeStoryboardApiMatch = trimmed.match(/^\\/?api\\/storyboard\\/([a-zA-Z0-9_-]+)\\/?$/);
        if (relativeStoryboardApiMatch) {
          return { type: 'storyboard', id: relativeStoryboardApiMatch[1], baseUrl: null };
        }
        
        // Relative storyboard format: /{id}
        const relativeStoryboardMatch = trimmed.match(/^\\/([a-zA-Z0-9_-]+)\\/?$/);
        if (relativeStoryboardMatch) {
          return { type: 'storyboard', id: relativeStoryboardMatch[1], baseUrl: null };
        }
        
        // Just an ID (alphanumeric with underscores/hyphens, reasonable length)
        // Assume it's a storyboard ID since that's the primary use case now
        if (/^[a-zA-Z0-9_-]{4,64}$/.test(trimmed)) {
          return { type: 'storyboard', id: trimmed, baseUrl: null };
        }
        
        return null;
      }

      async function fetchFromUrl() {
        const input = urlInput.value.trim();
        if (!input) {
          setStatus('Enter a storyboard URL', 'error');
          return;
        }

        const parsed = parseInput(input);
        if (!parsed) {
          setStatus('Invalid URL or ID format', 'error');
          return;
        }

        // Build the fetch URL based on type
        let fetchUrl;
        if (parsed.baseUrl) {
          // We have the full base URL
          const apiPath = parsed.type === 'storyboard' 
            ? '/api/storyboard/' 
            : '/api/figma-export/';
          fetchUrl = parsed.baseUrl + apiPath + parsed.id;
        } else {
          // No base URL - require full URL for security
          setStatus('Please paste the full URL including https://', 'error');
          return;
        }

        setStatus('Fetching storyboards…', 'loading');
        fetchUrlBtn.disabled = true;

        try {
          const response = await fetch(fetchUrl);
          
          if (!response.ok) {
            if (response.status === 404) {
              const errorType = parsed.type === 'storyboard' 
                ? 'Storyboard not found' 
                : 'Export not found or has expired';
              throw new Error(errorType);
            }
            throw new Error('Failed to fetch storyboard');
          }

          const payload = await response.json();
          
          if (payload.error) {
            throw new Error(payload.error);
          }

          setStatus('Importing…', 'loading');
          sendPayload(payload);
        } catch (error) {
          console.error('Failed to fetch from URL', error);
          setStatus(error.message || 'Failed to fetch storyboards', 'error');
        } finally {
          fetchUrlBtn.disabled = false;
        }
      }

      fetchUrlBtn.addEventListener('click', fetchFromUrl);
      
      urlInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          fetchFromUrl();
        }
      });

      importBtn.addEventListener('click', () => {
        const value = jsonInput.value.trim();
        if (!value) {
          setStatus('Paste JSON before importing', 'error');
          return;
        }
        try {
          const payload = JSON.parse(value);
          setStatus('Importing…', 'loading');
          sendPayload(payload);
        } catch (error) {
          console.error('Failed to parse JSON', error);
          setStatus('Invalid JSON', 'error');
        }
      });

      fileInput.addEventListener('change', async (event) => {
        const files = event.target && event.target.files ? event.target.files : null;
        const file = files && files[0];
        if (!file) {
          return;
        }

        try {
          const text = await file.text();
          jsonInput.value = text;
          const payload = JSON.parse(text);
          setStatus('Importing…', 'loading');
          sendPayload(payload);
        } catch (error) {
          console.error('Failed to read JSON file', error);
          setStatus('Could not read that file', 'error');
        } finally {
          event.target.value = '';
        }
      });

      window.onmessage = (event) => {
        const message = event.data.pluginMessage;
        if (!message) return;
        if (message.type === 'import-result') {
          setStatus(message.message, message.status);
        }
      };
    </script>
  </body>
</html>
`;

figma.showUI(HTML_TEMPLATE, {
  width: 420,
  height: 520,
  themeColors: true,
});

const VISUAL_WIDTH = 1920;
const VISUAL_HEIGHT = 1080;
const TEXT_SECTION_PADDING = 24;
const CARD_WIDTH = VISUAL_WIDTH;
const CARD_HORIZONTAL_GAP = 80;
const ROW_GAP = 80;
const COLUMN_COUNT = 6;

const PLACEHOLDER_VISUAL_FILL = {
  type: 'SOLID',
  color: { r: 0.08, g: 0.08, b: 0.09 },
};

const imagePaintCache = new Map();
const HTTP_PROTOCOL_REGEX = /^https?:\/\//i;

function createPlaceholderVisualFill() {
  return {
    type: PLACEHOLDER_VISUAL_FILL.type,
    color: {
      r: PLACEHOLDER_VISUAL_FILL.color.r,
      g: PLACEHOLDER_VISUAL_FILL.color.g,
      b: PLACEHOLDER_VISUAL_FILL.color.b,
    },
  };
}

figma.ui.onmessage = async (message) => {
  if (message && message.type === 'import-storyboards') {
    await importStoryboards(message.payload);
  }
};

async function importStoryboards(payload) {
  if (!payload || !Array.isArray(payload.storyboards)) {
    reportResult('error', 'Export JSON is missing a "storyboards" array.');
    return;
  }

  if (payload.storyboards.length === 0) {
    reportResult('error', 'No storyboards found in the export.');
    return;
  }

  try {
    await Promise.all([
      figma.loadFontAsync({ family: 'Inter', style: 'Bold' }),
      figma
        .loadFontAsync({ family: 'Inter', style: 'Semi Bold' })
        .catch(() => figma.loadFontAsync({ family: 'Inter', style: 'Bold' })),
      figma.loadFontAsync({ family: 'Inter', style: 'Regular' }),
    ]);
  } catch (error) {
    console.error('Unable to load fonts', error);
    reportResult(
      'error',
      'Could not load Inter fonts. Install Inter or change the plugin font settings.'
    );
    return;
  }

  const frames = [];
  let currentRowY = 0;
  let rowMaxHeight = 0;

  for (let index = 0; index < payload.storyboards.length; index++) {
    const storyboard = payload.storyboards[index];
    const frame = await createStoryboardFrame(
      storyboard,
      index,
      payload.transcript
    );
    frames.push(frame);

    const columnIndex = index % COLUMN_COUNT;
    frame.x = columnIndex * (CARD_WIDTH + CARD_HORIZONTAL_GAP);
    frame.y = currentRowY;
    rowMaxHeight = Math.max(rowMaxHeight, frame.height);

    if (
      columnIndex === COLUMN_COUNT - 1 ||
      index === payload.storyboards.length - 1
    ) {
      currentRowY += rowMaxHeight + ROW_GAP;
      rowMaxHeight = 0;
    }
  }

  if (!frames.length) {
    reportResult('error', 'Something went wrong — no frames were created.');
    return;
  }

  figma.currentPage.selection = frames;
  figma.viewport.scrollAndZoomIntoView(frames);
  figma.notify(`Created ${frames.length} storyboard frames`);
  reportResult('success', `Created ${frames.length} storyboard frames`);
}

async function createStoryboardFrame(storyboard, index, fallbackTranscript) {
  const storyboardTitle =
    storyboard && storyboard.title ? storyboard.title : 'Untitled storyboard';
  const frame = figma.createFrame();
  frame.name = `${String(index + 1).padStart(2, '0')} · ${storyboardTitle}`;
  frame.layoutMode = 'NONE';
  frame.clipsContent = true;
  frame.strokes = [
    {
      type: 'SOLID',
      color: { r: 0.2, g: 0.22, b: 0.27 },
    },
  ];
  frame.strokeWeight = 1;
  frame.cornerRadius = 24;
  frame.fills = [
    {
      type: 'SOLID',
      color: { r: 0.09, g: 0.1, b: 0.12 },
    },
  ];
  frame.effects = [
    {
      type: 'DROP_SHADOW',
      color: { r: 0, g: 0, b: 0, a: 0.25 },
      offset: { x: 0, y: 16 },
      radius: 32,
      visible: true,
      spread: 0,
      blendMode: 'NORMAL',
    },
  ];

  const visual = figma.createRectangle();
  visual.cornerRadius = 0;
  visual.x = 0;
  visual.y = 0;
  visual.resize(VISUAL_WIDTH, VISUAL_HEIGHT);
  const imagePaint = await getStoryboardImagePaint(storyboard);
  visual.fills = imagePaint ? [imagePaint] : [createPlaceholderVisualFill()];
  frame.appendChild(visual);

  const textPadding = TEXT_SECTION_PADDING;
  const textWidth = VISUAL_WIDTH - textPadding * 2;
  let cursorY = VISUAL_HEIGHT + textPadding;

  const badge = figma.createText();
  badge.fontName = { family: 'Inter', style: 'Regular' };
  badge.fontSize = 11;
  badge.fills = [{ type: 'SOLID', color: { r: 0.7, g: 0.72, b: 0.78 } }];
  badge.characters = `Storyboard ${index + 1}`;
  badge.x = textPadding;
  badge.y = cursorY;
  badge.textAutoResize = 'WIDTH_AND_HEIGHT';
  frame.appendChild(badge);
  cursorY += badge.height + 6;

  const notesText =
    storyboard &&
    typeof storyboard.notes === 'string' &&
    storyboard.notes.trim().length > 0
      ? storyboard.notes.trim()
      : null;

  if (notesText) {
    const notesLabel = figma.createText();
    notesLabel.fontName = { family: 'Inter', style: 'Semi Bold' };
    notesLabel.fontSize = 12;
    notesLabel.lineHeight = { value: 16, unit: 'PIXELS' };
    notesLabel.fills = [{ type: 'SOLID', color: { r: 0.85, g: 0.85, b: 0.9 } }];
    notesLabel.characters = 'Notes:';
    notesLabel.x = textPadding;
    notesLabel.y = cursorY;
    notesLabel.textAutoResize = 'WIDTH_AND_HEIGHT';
    frame.appendChild(notesLabel);
    cursorY += notesLabel.height + 4;

    const notes = figma.createText();
    notes.fontName = { family: 'Inter', style: 'Regular' };
    notes.fontSize = 14;
    notes.lineHeight = { value: 20, unit: 'PIXELS' };
    notes.fills = [{ type: 'SOLID', color: { r: 0.9, g: 0.9, b: 0.95 } }];
    notes.characters = notesText;
    notes.x = textPadding;
    notes.y = cursorY;
    notes.resize(textWidth, 100);
    notes.textAutoResize = 'HEIGHT';
    frame.appendChild(notes);
    cursorY += notes.height + 12;
  }

  const transcriptSource = getTranscriptSource(storyboard, fallbackTranscript);
  const hasTranscript = transcriptSource.length > 0;
  const primaryTextContent = hasTranscript ? transcriptSource : storyboardTitle;

  const primaryText = figma.createText();
  primaryText.fontName = hasTranscript
    ? { family: 'Inter', style: 'Regular' }
    : { family: 'Inter', style: 'Bold' };
  primaryText.fontSize = 22;
  primaryText.lineHeight = { value: 28, unit: 'PIXELS' };
  primaryText.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
  primaryText.characters = primaryTextContent;
  primaryText.x = textPadding;
  primaryText.y = cursorY;
  primaryText.resize(textWidth, 100);
  primaryText.textAutoResize = 'HEIGHT';
  frame.appendChild(primaryText);
  cursorY += primaryText.height + 10;

  const timingLabel = figma.createText();
  timingLabel.fontName = { family: 'Inter', style: 'Regular' };
  timingLabel.fontSize = 12;
  timingLabel.lineHeight = { value: 16, unit: 'PIXELS' };
  timingLabel.fills = [{ type: 'SOLID', color: { r: 0.67, g: 0.79, b: 0.96 } }];
  timingLabel.characters = formatTimingLabel(storyboard.start, storyboard.end);
  timingLabel.x = textPadding;
  timingLabel.y = cursorY;
  timingLabel.resize(textWidth, 40);
  timingLabel.textAutoResize = 'HEIGHT';
  frame.appendChild(timingLabel);
  cursorY += timingLabel.height + 16;

  const finalHeight = cursorY + textPadding;
  frame.resize(CARD_WIDTH, finalHeight);

  return frame;
}

async function getStoryboardImagePaint(storyboard) {
  const imageUrl = getStoryboardImageUrl(storyboard);
  if (!imageUrl) {
    return null;
  }

  if (imagePaintCache.has(imageUrl)) {
    return imagePaintCache.get(imageUrl);
  }

  const bytes = await fetchImageBytes(imageUrl);
  if (!bytes) {
    imagePaintCache.set(imageUrl, null);
    return null;
  }

  try {
    const image = figma.createImage(bytes);
    const paint = {
      type: 'IMAGE',
      imageHash: image.hash,
      scaleMode: 'FILL',
    };
    imagePaintCache.set(imageUrl, paint);
    return paint;
  } catch (error) {
    console.error(
      `Failed to create image fill for storyboard ${storyboard.id}`,
      error
    );
    imagePaintCache.set(imageUrl, null);
    return null;
  }
}

function getStoryboardImageUrl(storyboard) {
  if (!storyboard) {
    return null;
  }

  const candidates = [
    typeof storyboard.imageUrl === 'string' ? storyboard.imageUrl : null,
    typeof storyboard.image_url === 'string' ? storyboard.image_url : null,
  ];

  const match = candidates.find(
    (value) => typeof value === 'string' && value.trim().length > 0
  );

  return match ? match.trim() : null;
}

async function fetchImageBytes(imageUrl) {
  if (imageUrl.startsWith('data:')) {
    try {
      return dataUrlToBytes(imageUrl);
    } catch (error) {
      console.warn('Invalid data URL provided for storyboard image.', error);
      return null;
    }
  }

  if (!HTTP_PROTOCOL_REGEX.test(imageUrl)) {
    console.warn('Unsupported storyboard image URL protocol:', imageUrl);
    return null;
  }

  try {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      console.warn(
        `Failed to download storyboard image (${response.status}).`,
        imageUrl
      );
      return null;
    }
    const arrayBuffer = await response.arrayBuffer();
    return new Uint8Array(arrayBuffer);
  } catch (error) {
    console.error('Unable to fetch storyboard image:', imageUrl, error);
    return null;
  }
}

function dataUrlToBytes(dataUrl) {
  const commaIndex = dataUrl.indexOf(',');
  if (commaIndex === -1) {
    throw new Error('Invalid data URL.');
  }

  const base64 = dataUrl.slice(commaIndex + 1);
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function getTranscriptSource(storyboard, fallbackTranscript) {
  const storyboardTranscript =
    storyboard &&
    typeof storyboard.transcriptText === 'string' &&
    storyboard.transcriptText.trim().length > 0
      ? storyboard.transcriptText.trim()
      : '';

  if (storyboardTranscript.length > 0) {
    return storyboardTranscript;
  }

  if (typeof fallbackTranscript === 'string') {
    const trimmed = fallbackTranscript.trim();
    if (trimmed.length > 0) {
      return trimmed;
    }
  }

  return '';
}

function formatTimingLabel(start, end) {
  const hasStart = typeof start === 'number' && Number.isFinite(start);
  const hasEnd = typeof end === 'number' && Number.isFinite(end);

  if (!hasStart && !hasEnd) {
    return 'No timecodes';
  }

  const startLabel = hasStart ? formatTimecode(start) : '??:??';
  const endLabel = hasEnd ? formatTimecode(end) : '??:??';
  const duration =
    hasStart && hasEnd && end > start ? (end - start).toFixed(1) : null;

  return duration
    ? `${startLabel} – ${endLabel} (${duration}s)`
    : `${startLabel} – ${endLabel}`;
}

function formatTimecode(value) {
  const safeValue = Math.max(0, Number(value) || 0);
  const minutes = Math.floor(safeValue / 60);
  const seconds = Math.floor(safeValue % 60);
  const tenths = Math.floor((safeValue % 1) * 10);
  return `${minutes}:${String(seconds).padStart(2, '0')}.${tenths}`;
}

function reportResult(status, message) {
  figma.ui.postMessage({
    type: 'import-result',
    status,
    message,
  });
}

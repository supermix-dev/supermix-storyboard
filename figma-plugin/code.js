const HTML_TEMPLATE = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Supermix Storyboards Importer</title>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&display=swap');

      * {
        box-sizing: border-box;
      }

      :root {
        font-family: "DM Sans", system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
        color: #fff;
      }

      body {
        margin: 0;
        padding: 0;
        min-height: 100vh;
        background: linear-gradient(165deg, #38bdf8 0%, #3b82f6 50%, #1d4ed8 100%);
      }

      .container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: space-between;
        min-height: 100vh;
        padding: 32px 24px 24px;
        text-align: center;
      }

      .brand {
        font-size: 42px;
        font-weight: 700;
        letter-spacing: -1px;
        margin: 0;
        color: #fff;
        text-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
      }

      .content {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 24px 0;
      }

      .hint {
        font-size: 18px;
        font-weight: 500;
        color: rgba(255, 255, 255, 0.9);
        line-height: 1.5;
        margin: 0;
        max-width: 240px;
      }

      .bottom {
        width: 100%;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      button {
        border: none;
        border-radius: 12px;
        padding: 16px 24px;
        font-size: 16px;
        font-weight: 600;
        font-family: inherit;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        transition: all 0.2s ease;
        width: 100%;
      }

      button:disabled {
        opacity: 0.7;
        cursor: not-allowed;
      }

      button.primary {
        background: rgba(255, 255, 255, 0.2);
        color: rgba(255, 255, 255, 0.85);
        backdrop-filter: blur(8px);
        border: 1px solid rgba(255, 255, 255, 0.15);
      }

      button.primary:hover:not(:disabled) {
        background: rgba(255, 255, 255, 0.3);
        color: #fff;
        transform: translateY(-1px);
      }

      button.primary:active:not(:disabled) {
        transform: translateY(0);
      }

      .status {
        font-size: 13px;
        min-height: 20px;
        padding: 10px 14px;
        border-radius: 8px;
        text-align: center;
      }

      .status:empty {
        display: none;
      }

      .status[data-status="error"] {
        color: #fecaca;
        background: rgba(220, 38, 38, 0.25);
        border: 1px solid rgba(220, 38, 38, 0.3);
      }

      .status[data-status="success"] {
        color: #bbf7d0;
        background: rgba(34, 197, 94, 0.25);
        border: 1px solid rgba(34, 197, 94, 0.3);
      }

      .status[data-status="loading"] {
        color: rgba(255, 255, 255, 0.9);
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.15);
      }
    </style>
  </head>
  <body>
    <div class="container">
      <h1 class="brand">Supermix</h1>

      <div class="content">
        <p class="hint">
          Copy storyboards from Supermix,
          then press <strong>⌘V</strong> or <strong>Ctrl+V</strong> here.
        </p>
      </div>

      <div class="bottom">
        <div class="status" id="status" data-status="idle"></div>
      </div>
    </div>

    <script>
      const statusEl = document.getElementById('status');

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

      function handlePastedText(text) {
        if (!text || !text.trim()) {
          setStatus('Clipboard is empty. Copy storyboards from Supermix first.', 'error');
          return;
        }

        let payload;
        try {
          payload = JSON.parse(text.trim());
        } catch (parseError) {
          setStatus('Clipboard does not contain valid storyboard data.', 'error');
          return;
        }

        if (!payload.storyboards || !Array.isArray(payload.storyboards)) {
          setStatus('Invalid storyboard data. Copy from Supermix and try again.', 'error');
          return;
        }

        setStatus('Importing storyboards…', 'loading');
        sendPayload(payload);
      }

      // Listen for paste events on the document
      document.addEventListener('paste', (event) => {
        event.preventDefault();
        const text = event.clipboardData?.getData('text/plain') || '';
        handlePastedText(text);
      });

      // Show ready status on load
      setStatus('Ready — paste your storyboards (⌘V / Ctrl+V)', 'loading');

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
  width: 300,
  height: 400,
  themeColors: false,
});

const VISUAL_WIDTH = 3840;
const VISUAL_HEIGHT = 2160;
const TEXT_SECTION_PADDING = 48;
const CARD_WIDTH = VISUAL_WIDTH;
const CARD_HORIZONTAL_GAP = 160;
const ROW_GAP = 160;
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
  frame.name = `Shot #${index + 1}`;
  frame.layoutMode = 'NONE';
  frame.clipsContent = true;
  frame.strokes = [
    {
      type: 'SOLID',
      color: { r: 0.2, g: 0.22, b: 0.27 },
    },
  ];
  frame.strokeWeight = 2;
  frame.cornerRadius = 48;
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
      offset: { x: 0, y: 32 },
      radius: 64,
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

  // Notes section - always shown with placeholder if empty
  const notesText =
    storyboard &&
    typeof storyboard.notes === 'string' &&
    storyboard.notes.trim().length > 0
      ? storyboard.notes.trim()
      : null;

  const notesLabel = figma.createText();
  notesLabel.fontName = { family: 'Inter', style: 'Semi Bold' };
  notesLabel.fontSize = 24;
  notesLabel.lineHeight = { value: 32, unit: 'PIXELS' };
  notesLabel.fills = [{ type: 'SOLID', color: { r: 0.85, g: 0.85, b: 0.9 } }];
  notesLabel.characters = 'Notes:';
  notesLabel.x = textPadding;
  notesLabel.y = cursorY;
  notesLabel.textAutoResize = 'WIDTH_AND_HEIGHT';
  frame.appendChild(notesLabel);
  cursorY += notesLabel.height + 8;

  const notes = figma.createText();
  notes.fontName = { family: 'Inter', style: 'Regular' };
  notes.fontSize = 44;
  notes.lineHeight = { value: 56, unit: 'PIXELS' };

  if (notesText) {
    notes.fills = [{ type: 'SOLID', color: { r: 0.9, g: 0.9, b: 0.95 } }];
    notes.characters = notesText;
  } else {
    // Placeholder text with muted color
    notes.fills = [{ type: 'SOLID', color: { r: 0.5, g: 0.52, b: 0.58 } }];
    notes.characters = 'Add notes here...';
  }

  notes.x = textPadding;
  notes.y = cursorY;
  notes.resize(textWidth, 200);
  notes.textAutoResize = 'HEIGHT';
  frame.appendChild(notes);
  cursorY += notes.height + 24;

  // Transcript section
  const transcriptSource = getTranscriptSource(storyboard, fallbackTranscript);
  const hasTranscript = transcriptSource.length > 0;
  const primaryTextContent = hasTranscript ? transcriptSource : storyboardTitle;

  const transcriptLabel = figma.createText();
  transcriptLabel.fontName = { family: 'Inter', style: 'Semi Bold' };
  transcriptLabel.fontSize = 24;
  transcriptLabel.lineHeight = { value: 32, unit: 'PIXELS' };
  transcriptLabel.fills = [
    { type: 'SOLID', color: { r: 0.85, g: 0.85, b: 0.9 } },
  ];
  transcriptLabel.characters = 'Transcript:';
  transcriptLabel.x = textPadding;
  transcriptLabel.y = cursorY;
  transcriptLabel.textAutoResize = 'WIDTH_AND_HEIGHT';
  frame.appendChild(transcriptLabel);
  cursorY += transcriptLabel.height + 8;

  const primaryText = figma.createText();
  primaryText.fontName = hasTranscript
    ? { family: 'Inter', style: 'Regular' }
    : { family: 'Inter', style: 'Bold' };
  primaryText.fontSize = 44;
  primaryText.lineHeight = { value: 56, unit: 'PIXELS' };
  primaryText.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
  primaryText.characters = primaryTextContent;
  primaryText.x = textPadding;
  primaryText.y = cursorY;
  primaryText.resize(textWidth, 200);
  primaryText.textAutoResize = 'HEIGHT';
  frame.appendChild(primaryText);
  cursorY += primaryText.height + 20;

  const timingLabel = figma.createText();
  timingLabel.fontName = { family: 'Inter', style: 'Semi Bold' };
  timingLabel.fontSize = 36;
  timingLabel.lineHeight = { value: 48, unit: 'PIXELS' };
  timingLabel.fills = [{ type: 'SOLID', color: { r: 0.67, g: 0.79, b: 0.96 } }];
  timingLabel.characters = formatTimingLabel(storyboard.start, storyboard.end);
  timingLabel.x = textPadding;
  timingLabel.y = cursorY;
  timingLabel.resize(textWidth, 80);
  timingLabel.textAutoResize = 'HEIGHT';
  frame.appendChild(timingLabel);
  cursorY += timingLabel.height + 32;

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

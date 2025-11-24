'use client';

import type { StoryboardSceneProps } from '@/app/actions/storyboards';
import type { ShadeTranscriptEntry } from '@/lib/shade/shade.types';
import { useState } from 'react';

type FileSystemWritableFileStreamLite = {
  write: (data: string | Blob) => Promise<void>;
  close: () => Promise<void>;
};

type FileSystemFileHandleLite = {
  createWritable: () => Promise<FileSystemWritableFileStreamLite>;
  getFile: () => Promise<File>;
};

type FilePickerWindow = Window &
  typeof globalThis & {
    showSaveFilePicker?: (options?: {
      suggestedName?: string;
      types?: Array<{
        description: string;
        accept: Record<string, string[]>;
      }>;
    }) => Promise<FileSystemFileHandleLite>;
    showOpenFilePicker?: (options?: {
      multiple?: boolean;
      types?: Array<{
        description: string;
        accept: Record<string, string[]>;
      }>;
    }) => Promise<FileSystemFileHandleLite[]>;
  };

type SaveMessage = {
  type: 'success' | 'error';
  text: string;
} | null;

type FileStateProps = {
  assetPath: string;
  transcript: ShadeTranscriptEntry[] | null;
  storyboards: StoryboardSceneProps[];
};

export function useSaveState({
  assetPath,
  transcript,
  storyboards,
}: FileStateProps) {
  const [fileHandle, setFileHandle] = useState<FileSystemFileHandleLite | null>(
    null
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<SaveMessage>(null);

  const saveData = async (forceNewFile = false) => {
    setIsSaving(true);
    setSaveMessage(null);
    try {
      let handle: FileSystemFileHandleLite | null = forceNewFile
        ? null
        : fileHandle;
      const filePickerWindow = window as FilePickerWindow;

      if (
        !handle &&
        typeof filePickerWindow.showSaveFilePicker === 'function'
      ) {
        try {
          handle = await filePickerWindow.showSaveFilePicker({
            suggestedName: 'storyboard-state.json',
            types: [
              {
                description: 'JSON Files',
                accept: { 'application/json': ['.json'] },
              },
            ],
          });
          if (!forceNewFile) {
            setFileHandle(handle);
          }
        } catch (err) {
          if ((err as Error).name === 'AbortError') {
            setIsSaving(false);
            return;
          }
          throw err;
        }
      }

      const data = JSON.stringify(
        {
          transcript,
          storyboards,
          assetPath,
        },
        null,
        2
      );

      if (handle) {
        const writable = await handle.createWritable();
        await writable.write(data);
        await writable.close();
      } else {
        // Fallback for browsers without File System Access API
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'storyboard-state.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }

      setSaveMessage({ type: 'success', text: 'Saved successfully!' });
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (e) {
      console.error(e);
      setSaveMessage({ type: 'error', text: 'Error saving file' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoad = async (): Promise<FileStateProps | null> => {
    setSaveMessage(null);
    try {
      let file: File | null = null;
      const filePickerWindow = window as FilePickerWindow;

      if (typeof filePickerWindow.showOpenFilePicker === 'function') {
        try {
          const [handle] = await filePickerWindow.showOpenFilePicker({
            types: [
              {
                description: 'JSON Files',
                accept: { 'application/json': ['.json'] },
              },
            ],
            multiple: false,
          });
          setFileHandle(handle);
          file = await handle.getFile();
        } catch (err) {
          if ((err as Error).name === 'AbortError') {
            return null;
          }
          throw err;
        }
      } else {
        // Fallback using input element
        return new Promise((resolve) => {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = '.json';
          input.onchange = async (event) => {
            const files = (event.target as HTMLInputElement).files;
            if (files && files.length > 0) {
              const file = files[0];
              const text = await file.text();
              try {
                const data = JSON.parse(text) as FileStateProps;
                setSaveMessage({
                  type: 'success',
                  text: 'File loaded successfully!',
                });
                setTimeout(() => setSaveMessage(null), 3000);
                resolve(data);
              } catch (err) {
                console.error('Error parsing JSON', err);
                setSaveMessage({ type: 'error', text: 'Invalid JSON file' });
                resolve(null);
              }
            } else {
              resolve(null);
            }
          };
          input.click();
        });
      }

      if (file) {
        const text = await file.text();
        const data = JSON.parse(text) as FileStateProps;
        // Basic validation
        if (!data.storyboards && !data.transcript && !data.assetPath) {
          throw new Error('Invalid file format');
        }
        setSaveMessage({ type: 'success', text: 'File loaded successfully!' });
        setTimeout(() => setSaveMessage(null), 3000);
        return data;
      }
    } catch (e) {
      console.error(e);
      setSaveMessage({ type: 'error', text: 'Error loading file' });
    }
    return null;
  };

  const handleSave = () => saveData(false);
  const handleSaveAs = () => saveData(true);

  return {
    isSaving,
    saveMessage,
    handleSave,
    handleSaveAs,
    handleLoad,
  };
}


import { Injectable } from '@angular/core';
import { GoogleGenAI, GenerateVideosOperation } from '@google/genai';
// IMPORTANT: This service assumes that `process.env.API_KEY` is set in the environment.
const API_KEY = process.env.API_KEY;

@Injectable({
  providedIn: 'root',
})
export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    if (!API_KEY) {
      throw new Error('API_KEY environment variable not set.');
    }
    this.ai = new GoogleGenAI({ apiKey: API_KEY });
  }

  async generateLogo(prompt: string): Promise<string> {
    try {
      const response = await this.ai.models.generateImages({
        model: 'imagen-3.0-generate-002',
        prompt: `A clean, modern, vector-style logo for: ${prompt}. The logo should be on a solid, neutral background.`,
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/png',
          aspectRatio: '1:1',
        },
      });

      if (response.generatedImages && response.generatedImages.length > 0) {
        const base64ImageBytes = response.generatedImages[0].image.imageBytes;
        return `data:image/png;base64,${base64ImageBytes}`;
      }
      throw new Error('No images were generated.');
    } catch (error) {
      console.error('Error generating logo:', error);
      throw new Error('Failed to generate logo. Please check the console for details.');
    }
  }

  async generateAnimation(
    imageBase64: string,
    aspectRatio: '16:9' | '9:16',
    updateLoadingMessage: (message: string) => void
  ): Promise<string> {
    const loadingMessages = [
        'Initializing video synthesis...',
        'Analyzing logo structure...',
        'Generating motion vectors...',
        'Rendering keyframes...',
        'Applying cinematic effects...',
        'Compositing final animation...',
        'Almost there, polishing the details...'
    ];
    let messageIndex = 0;
    
    try {
      updateLoadingMessage(loadingMessages[messageIndex++]);
      let operation = await this.ai.models.generateVideos({
        model: 'veo-2.0-generate-001',
        prompt: 'Animate this logo with a clean, dynamic, and professional cinematic reveal.',
        image: {
          imageBytes: imageBase64,
          mimeType: 'image/png',
        },
        config: {
          numberOfVideos: 1,
          aspectRatio: aspectRatio,
        },
      });

      const messageInterval = setInterval(() => {
        updateLoadingMessage(loadingMessages[messageIndex % loadingMessages.length]);
        messageIndex++;
      }, 8000);

      while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 10000)); // Poll every 10 seconds
        operation = await this.ai.operations.getVideosOperation({ operation: operation });
      }

      clearInterval(messageInterval);

      if (operation.response?.generatedVideos && operation.response.generatedVideos.length > 0) {
        const downloadLink = operation.response.generatedVideos[0].video.uri;
        // The API key must be appended to the download link to fetch the video bytes.
        const videoResponse = await fetch(`${downloadLink}&key=${API_KEY}`);
        if (!videoResponse.ok) {
            throw new Error(`Failed to fetch video: ${videoResponse.statusText}`);
        }
        const videoBlob = await videoResponse.blob();
        return URL.createObjectURL(videoBlob);
      }
      throw new Error('No video was generated.');
    } catch (error) {
      console.error('Error generating animation:', error);
      throw new Error('Failed to generate animation. Please check the console for details.');
    }
  }
}

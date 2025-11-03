import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GeminiService } from './services/gemini.service';

type AppState = 'idle' | 'generatingLogo' | 'generatingVideo' | 'finished' | 'error';
type AspectRatio = '16:9' | '9:16';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [GeminiService],
})
export class AppComponent {
  private geminiService = inject(GeminiService);

  // State Signals
  appState = signal<AppState>('idle');
  error = signal<string | null>(null);
  activeTab = signal<'generate' | 'upload'>('generate');
  showDownloadOptions = signal(false);
  showShareOptions = signal(false);

  // Input Signals
  logoPrompt = signal('');
  uploadedImage = signal<string | null>(null); // as data URL
  aspectRatio = signal<AspectRatio>('16:9');
  
  // Output Signals
  generatedLogo = signal<string | null>(null); // as data URL
  generatedVideoUrl = signal<string | null>(null);
  videoLoadingMessage = signal<string>('');

  imageSourceForAnimation = computed(() => {
    return this.activeTab() === 'generate' ? this.generatedLogo() : this.uploadedImage();
  });

  selectTab(tab: 'generate' | 'upload'): void {
    this.activeTab.set(tab);
  }

  handleImageUpload(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        this.uploadedImage.set(e.target?.result as string);
        this.generatedLogo.set(null); // Clear generated logo
        this.activeTab.set('upload'); // Switch to upload tab
        this.appState.set('idle');
        this.generatedVideoUrl.set(null);
      };
      reader.readAsDataURL(file);
    }
  }

  async submitLogoPrompt(): Promise<void> {
    if (!this.logoPrompt().trim()) return;
    this.appState.set('generatingLogo');
    this.error.set(null);
    this.generatedLogo.set(null);
    this.generatedVideoUrl.set(null);

    try {
      const logoDataUrl = await this.geminiService.generateLogo(this.logoPrompt());
      this.generatedLogo.set(logoDataUrl);
      this.uploadedImage.set(null); // Clear uploaded image
      this.activeTab.set('generate');
      this.appState.set('idle');
    } catch (e: any) {
      this.error.set(e.message || 'An unknown error occurred.');
      this.appState.set('error');
    }
  }

  async submitAnimationRequest(): Promise<void> {
    const imageSource = this.imageSourceForAnimation();
    if (!imageSource) {
      this.error.set('Please generate or upload a logo first.');
      this.appState.set('error');
      return;
    }

    this.appState.set('generatingVideo');
    this.error.set(null);
    this.generatedVideoUrl.set(null);

    try {
      // Strip "data:image/png;base64," prefix for the API
      const base64Data = imageSource.split(',')[1];
      const videoUrl = await this.geminiService.generateAnimation(
        base64Data,
        this.aspectRatio(),
        (message) => this.videoLoadingMessage.set(message)
      );
      this.generatedVideoUrl.set(videoUrl);
      this.appState.set('finished');
    } catch (e: any) {
      this.error.set(e.message || 'An unknown error occurred during video generation.');
      this.appState.set('error');
    }
  }

  downloadVideo(format: 'mp4' | 'gif'): void {
    const url = this.generatedVideoUrl();
    if (!url) return;

    const a = document.createElement('a');
    a.href = url;
    a.download = `animated-logo.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    this.showDownloadOptions.set(false);
  }

  shareOnSocial(platform: 'twitter' | 'facebook' | 'linkedin'): void {
    const text = encodeURIComponent('Check out this amazing animated logo I created with the AI Logo Animator!');
    // In a real-world app, you would replace this with a URL to the hosted app/video.
    const appUrl = encodeURIComponent('https://your-app-url.com');
    let shareUrl = '';

    switch (platform) {
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?text=${text}&url=${appUrl}`;
        break;
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${appUrl}&quote=${text}`;
        break;
      case 'linkedin':
        shareUrl = `https://www.linkedin.com/shareArticle?mini=true&url=${appUrl}&title=AI Animated Logo&summary=${text}`;
        break;
    }
    window.open(shareUrl, '_blank', 'noopener,noreferrer');
    this.showShareOptions.set(false);
  }

  reset(): void {
    this.appState.set('idle');
    this.error.set(null);
    this.logoPrompt.set('');
    this.uploadedImage.set(null);
    this.generatedLogo.set(null);
    this.generatedVideoUrl.set(null);
    this.activeTab.set('generate');
    this.showDownloadOptions.set(false);
    this.showShareOptions.set(false);
  }
}

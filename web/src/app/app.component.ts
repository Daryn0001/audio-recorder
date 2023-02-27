import {Component, ElementRef, OnDestroy, ViewChild} from "@angular/core";
import { AudioRecordingService } from "./service/audio-recording.service";
import { DomSanitizer } from "@angular/platform-browser";

@Component({
  selector: "my-app",
  templateUrl: "./app.component.html",
  styleUrls: ["app.component.scss"]
})
export class AppComponent implements OnDestroy {
  @ViewChild('canvas') canvas: ElementRef<HTMLCanvasElement>;

  isRecording = false;
  recordedTime: any;
  blobUrl;
  teste;

  constructor(
    private audioRecordingService: AudioRecordingService,
    private sanitizer: DomSanitizer
  ) {
    this.audioRecordingService
      .recordingFailed()
      .subscribe(() => (this.isRecording = false));
    this.audioRecordingService
      .getRecordedTime()
      .subscribe(time => (this.recordedTime = time));
    this.audioRecordingService.getRecordedBlob().subscribe(data => {
      this.teste = data;
      this.blobUrl = this.sanitizer.bypassSecurityTrustUrl(
        URL.createObjectURL(data.blob)
      );
    });
  }

  startRecording() {

    if (!this.isRecording) {
      this.isRecording = true;
      this.audioRecordingService.startRecording(this.canvas);
    }
  }

  abortRecording() {
    if (this.isRecording) {
      this.isRecording = false;
      this.audioRecordingService.abortRecording();
    }
  }

  stopRecording() {
    if (this.isRecording) {
      this.audioRecordingService.stopRecording();
      this.isRecording = false;
    }
  }

  clearRecordedData() {
    this.blobUrl = null;
  }

  ngOnDestroy(): void {
    this.abortRecording();
  }

  download(): void {
    const url = window.URL.createObjectURL(this.teste.blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = this.teste.title;
    link.click();
  }
}

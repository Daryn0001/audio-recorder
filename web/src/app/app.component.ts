import {ChangeDetectorRef, Component, ElementRef, OnDestroy, ViewChild} from "@angular/core";
import {AudioRecordingService} from "./service/audio-recording.service";
import {DomSanitizer} from "@angular/platform-browser";
import WaveSurfer from 'wavesurfer.js';
import TimelinePlugin from 'wavesurfer.js/dist/plugin/wavesurfer.timeline.min.js';
import Regions from 'wavesurfer.js/dist/plugin/wavesurfer.regions.min.js';


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
  blob: Blob;
  teste;


  wave: WaveSurfer = null;
  public graph = undefined;


  constructor(private cdr: ChangeDetectorRef,
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
      this.blob = data.blob;
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

  onPreviewPressed(): void {
    if (!this.wave) {
      this.generateWaveform();
    }

    this.cdr.detectChanges();

    if (this.blob) {
      console.log(" blob: ", this.blob);
      Promise.resolve().then(() => this.wave.loadBlob(this.blob));
    }
  }

  onStopPressed(): void {
    this.wave.stop();
  }

  generateWaveform(): void {
    Promise.resolve(null).then(() => {
      this.wave = WaveSurfer.create({
        container: '#waveform',
        waveColor: 'violet',
        progressColor: 'purple',
        plugins: [
          TimelinePlugin.create({
            container: '#wave-timeline'
          }),
          Regions.create({
            regions: [
              {
                start: 1,
                end: 3,
                loop: true,
                color: 'hsla(400, 100%, 30%, 0.5)'
              }, {
                start: 5,
                end: 7,
                loop: false,
                color: 'hsla(200, 50%, 70%, 0.4)'
              }
            ],
            dragSelection: {
              slop: 5
            }
          })
        ]
      });

      this.wave.on('ready', () => {
        this.wave.play();
      });
    });
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

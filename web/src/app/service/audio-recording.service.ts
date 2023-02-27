import {AfterViewInit, ElementRef, Injectable} from "@angular/core";
import * as RecordRTC from "recordrtc";
import gsap from "gsap";
import * as dat from 'dat.gui';
// @ts-ignore
import moment from "moment";
import { Observable, Subject } from "rxjs";

interface RecordedAudioOutput {
  blob: Blob;
  title: string;
}

@Injectable()
export class AudioRecordingService {
  private stream;
  private recorder;
  private interval: any;
  private startTime: any;
  private _recorded = new Subject<RecordedAudioOutput>();
  private _recordingTime = new Subject<string>();
  private _recordingFailed = new Subject<string>();

  private drawingContext;
  private PIXELS_PER_SECONDS = 50;

  private audioCtx: AudioContext;

  canvas: ElementRef<HTMLCanvasElement>;

  report;
  visualizing = false;
  timeline = gsap.timeline();

  CONFIG = {
    fft: 2048,
    show: true,
    duration: 0.2,
    fps: 24,
  };

  VIZ_CONFIG = {
    bar: {
      width: 2,
      minHeight: 0.04,
      maxHeight: 0.96,
      gap: 2,
    },
    pixelsPerSecond: this.PIXELS_PER_SECONDS,
    barDelay: 1 / this.CONFIG.fps,
  };

  BARS: any = [];
  CTRL;
  fillStyle: CanvasGradient;

  constructor() {
    gsap.ticker.fps(this.CONFIG.fps)
  }



  initFillStyle(canvas) {
    this.fillStyle = this.drawingContext.createLinearGradient(
      canvas.width / 2,
      0,
      canvas.height / 2,
      canvas.height
    );

    // this.fillStyle.addColorStop(0.2, 'hsl(10, 80%, 50%)')
    this.fillStyle.addColorStop(0.2, '#2E3840')
    // this.fillStyle.addColorStop(0.8, '#18122B')
    // this.fillStyle.addColorStop(0.5, '#609EA2')
    // this.fillStyle.addColorStop(0.5, 'hsl(120, 80%, 50%)')

    this.drawingContext.fillStyle = this.fillStyle;
  }

  drawBar = ({x, size}: { x: number, size: number }): void => {
    this.initFillStyle(this.canvas.nativeElement);


    const pointX = x - this.VIZ_CONFIG.bar.width / 2;
    const pointY = this.canvas.nativeElement.height / 2 - size / 2;
    this.drawingContext.fillRect(pointX, pointY, this.VIZ_CONFIG.bar.width, size);
  }

  drawBars = () => {
    this.drawingContext.clearRect(0, 0, this.canvas.nativeElement.width, this.canvas.nativeElement.height);
    for (const BAR of this.BARS) {
      this.drawBar(BAR);
    }
  }


  analyse  (stream)  {

    this.audioCtx = new AudioContext();
    const analyser = this.audioCtx.createAnalyser();
    analyser.fftSize = this.CONFIG.fft;
    const source = this.audioCtx.createMediaStreamSource(stream);
    const dataArr = new Uint8Array(analyser.frequencyBinCount);
    source.connect(analyser);

    if (this.BARS && this.BARS.length > 0) {
      this.BARS.length = 0;
    }

    this.report = () => {
      if (this.recorder) {
        analyser.getByteFrequencyData(dataArr);
        const volume = Math.floor((Math.max(...dataArr) / 255) * 100);

        const bar = {
          x: this.canvas.nativeElement.width + this.VIZ_CONFIG.bar.width / 2,
          size: gsap.utils.mapRange(0, 100, 5, this.canvas.nativeElement.height * 0.8)(volume)
        }

        this.BARS.push(bar);

        this.timeline
          .to(bar, {
            x: `-=${this.canvas!.nativeElement.width + this.VIZ_CONFIG.bar.width}`,
            ease: 'none',
            duration: this.canvas!.nativeElement.width / ((this.VIZ_CONFIG.bar.width + this.VIZ_CONFIG.bar.gap) * this.CONFIG.fps),
          }, this.BARS.length * this.VIZ_CONFIG.barDelay);

      }

      if (this.recorder || this.visualizing) {
        this.drawBars();
      }
    }

    gsap.ticker.add(this.report);
  }


  getRecordedBlob(): Observable<RecordedAudioOutput> {
    return this._recorded.asObservable();
  }

  getRecordedTime(): Observable<string> {
    return this._recordingTime.asObservable();
  }

  recordingFailed(): Observable<string> {
    return this._recordingFailed.asObservable();
  }

  startRecording(canvas: ElementRef) {
    // console.log(' :: this.recorder: ', this.recorder);
    if (this.recorder) {
      // It means recording is already started or it is already recording something
      return;
    }
    this.canvas = canvas;
    this.canvas.nativeElement.width = canvas.nativeElement.offsetWidth;
    this.canvas.nativeElement.height = canvas.nativeElement.offsetHeight;
    this.drawingContext = this.canvas.nativeElement.getContext('2d')
    this.visualizing = true

    this._recordingTime.next("00:00");
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then(s => {
        this.stream = s;
        this.record();

        this.analyse(this.stream)
      })
      .catch(error => {
        this._recordingFailed.next(error);
      });
  }

  abortRecording() {
    this.stopMedia();
  }

  private record() {
    this.recorder = new RecordRTC.StereoAudioRecorder(this.stream, {
      type: "audio",
      mimeType: "audio/webm"
    });

    this.recorder.record();
    this.startTime = moment();
    this.interval = setInterval(() => {
      const currentTime = moment();
      const diffTime = moment.duration(currentTime.diff(this.startTime));
      const time =
        this.toString(diffTime.minutes()) +
        ":" +
        this.toString(diffTime.seconds());
      this._recordingTime.next(time);
    }, 1000);


  }

  private toString(value: string | number) {
    let val = value;
    if (!value) val = "00";
    if (value < 10) val = "0" + value;
    return val;
  }

  stopRecording() {
    if (this.recorder) {
      this.recorder.stop(
          (blob: any) => {
          if (this.startTime) {
            const mp3Name = encodeURIComponent(
              "audio_" + new Date().getTime() + ".mp3"
            );
            this.stopMedia();
            this._recorded.next({ blob: blob, title: mp3Name });
          }
        },
        (err: string) => {
          this.stopMedia();
          this._recordingFailed.next(err);
        }
      );
    }
  }

  private stopMedia() {
    if (this.recorder) {
      this.recorder = null;

      clearInterval(this.interval);
      this.startTime = null;
      if (this.stream) {
        this.stream.getAudioTracks().forEach((track: { stop: () => any; }) => track.stop());
        this.stream = null;

        this.timeline.clear();
        gsap.ticker.remove(this.report);
        this.audioCtx.close();
      }
    }
  }
}

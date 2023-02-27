import {NgModule} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';

import {AppComponent} from './app.component';
import {AudioRecordingService} from "./service/audio-recording.service";

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,

  ],
  providers: [AudioRecordingService],
  bootstrap: [AppComponent]
})
export class AppModule { }

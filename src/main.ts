import { bootstrapApplication } from '@angular/platform-browser';
import { App } from './app/app';
import { provideBrowserGlobalErrorListeners, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';

bootstrapApplication(App, {
  providers: [
    provideRouter([]),
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
  ],
}).catch((err) => console.error(err));

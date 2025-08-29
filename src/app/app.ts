import {
  afterEveryRender,
  afterNextRender,
  Component,
  computed,
  Directive,
  effect,
  ElementRef,
  inject,
  Injectable,
  signal,
} from '@angular/core';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { FormsModule } from '@angular/forms';
import { MatToolbarModule } from '@angular/material/toolbar';
import { JsonPipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class ElementRegistry {
  elements = new Map<Element, string>();
}

@Directive({
  selector: '[tracked]',
  host: {
    '[class.halo-active]': 'showHalo()',
    class: 'tracked',
  },
})
export class Tracked {
  showHalo = signal(true);
  bindingUpdated = signal(false);

  constructor(
    private eltRef: ElementRef,
    private elementRegistry: ElementRegistry,
  ) {
    afterEveryRender(() => {
      const newText =
        this.eltRef.nativeElement.innerText ||
        this.eltRef.nativeElement.querySelector('input')?.value;
      const oldText = this.elementRegistry.elements.get(this.eltRef.nativeElement);
      if (newText !== oldText) {
        console.log(newText, oldText);
        // Not using signals here to avoid triggering another CD cycle
        this.eltRef.nativeElement.classList.add('binding-highlight');
        setTimeout(() => this.eltRef.nativeElement.classList.remove('binding-highlight'), 1000);
      }
    });
    afterNextRender(() => {
      this.elementRegistry.elements.set(
        this.eltRef.nativeElement,
        this.eltRef.nativeElement.innerText ||
          this.eltRef.nativeElement.querySelector('input')?.value,
      );
      this.showHalo.set(true);
      setTimeout(() => this.showHalo.set(false), 1000);
    });
  }
}

@Component({
  selector: 'app-root',
  imports: [Tracked, MatButtonToggleModule, FormsModule, MatToolbarModule, JsonPipe],
  styleUrls: ['../styles.css'],
  template: `
    <mat-toolbar color="primary">
      <span>Angular - &#64; tracking demo</span>
    </mat-toolbar>

    <div class="toggle-container">
      <mat-button-toggle-group
        #trackingGroup="matButtonToggleGroup"
        (change)="onTrackingStrategyChange(trackingGroup.value)"
        [value]="trackingStrategy()"
        aria-label="Tracking Strategy"
      >
        <mat-button-toggle value="index">$index</mat-button-toggle>
        <mat-button-toggle value="identity">identity</mat-button-toggle>
        <mat-button-toggle value="id">id</mat-button-toggle>
      </mat-button-toggle-group>

      <mat-button-toggle-group
        #domGroup="matButtonToggleGroup"
        (change)="onDomStrategyChange(domGroup.value)"
        [value]="domStrategy()"
        aria-label="DOM Strategy"
      >
        <mat-button-toggle value="stateless">Stateless DOM</mat-button-toggle>
        <mat-button-toggle value="stateful">Stateful DOM</mat-button-toggle>
      </mat-button-toggle-group>
    </div>

    <div class="demo-content">
      <div class="item-row">
        <pre>
          &commat;for(item of arr(); track {{trackingString()}}) &lcub;<br>
            &nbsp; &nbsp; &lt;div&gt;&lcub;&ZeroWidthSpace;&lcub; item.value &rcub;&ZeroWidthSpace;&rcub;&lt;/div&gt;<br>
          &rcub;
        </pre>
      </div>
      @for (item of arr(); track trackByFn($index, item)) {
        <div class="item-row">
          <div tracked>
            @if (domStrategy() === 'stateless') {
              <div>{{ item.value }}</div>
            } @else {
              <input [value]="item.value" />
            }
          </div>
          <pre>
           {{ item | json }}
        </pre
          >
        </div>
      }
    </div>
    <div class="legend">
      <div class="legend-item">
        <span class="binding-highlight-text">highlighted text</span>
        <span> binding is updated</span>
      </div>
      <div class="legend-item">
        <div class="blue-box"></div>
        <span> a new DOM element was created</span>
      </div>
    </div>

    <div class="separator"></div>

    <div class="explanation">
      <h2>Explanation</h2>
      <p>
        The array displayed in this demo is updated every 3 seconds (items are replaced) to showcase
        how Angular efficiently manages DOM updates.
        <br /><br />
        When using the statefull DOM, you can judge how tracking impacts the focus for example
        <br /><br />
        The <code>&#64;for</code> directive with the <code>track</code> option allows you to specify
        a tracking function. This function tells Angular how to uniquely identify each item in the
        array, which helps optimize rendering by reusing DOM elements when possible. By using
        different tracking strategies (by index, id, or object identity), you can observe how
        Angular's change detection and rendering behavior changes in response to array updates.
      </p>
    </div>
  `,
})
export class App {
  elementRegistry = inject(ElementRegistry);
  arr = signal(
    Array.from({ length: 10 }).map((_, i) => ({ id: i, value: i })),
    { equal: () => false },
  );
  trackingStrategy = signal<'index' | 'identity' | 'id'>('index');
  domStrategy = signal<'stateless' | 'stateful'>('stateless');
  trackingString = computed(() => {
    switch (this.trackingStrategy()) {
      case 'index':
        return '$index';
      case 'id':
        return 'item.id';
      case 'identity':
        return 'item';
    }
  });

  constructor(
    private router: Router,
    private route: ActivatedRoute,
  ) {
    const params = new URLSearchParams(window.location.search);

    const trackingParam = params.get('tracking');
    if (trackingParam) {
      this.trackingStrategy.set(trackingParam as 'index' | 'identity' | 'id');
    }
    const domParam = params.get('dom');
    if (domParam) {
      this.domStrategy.set(domParam as 'stateless' | 'stateful');
    }

    const setBodyTheme = (isDark: boolean) => {
      document.body.classList.toggle('dark-theme', isDark);
      document.body.classList.toggle('light-theme', !isDark);
    };

    const darkModeMatcher = window.matchMedia('(prefers-color-scheme: dark)');
    setBodyTheme(darkModeMatcher.matches);
    darkModeMatcher.addEventListener('change', (e) => setBodyTheme(e.matches));

    effect(() => {
      this.router.navigate([], {
        queryParams: {
          tracking: this.trackingStrategy(),
          dom: this.domStrategy(),
        },
        queryParamsHandling: 'merge',
      });
    });

    this.reset();
    setInterval(() => {
      this.arr.set(this.arr().map((item) => ({ id: item.id + 1, value: item.value + 1 })));
    }, 3000);
  }

  onTrackingStrategyChange(strategy: 'index' | 'identity' | 'id') {
    this.trackingStrategy.set(strategy);
    this.reset();
  }

  onDomStrategyChange(strategy: 'stateless' | 'stateful') {
    this.domStrategy.set(strategy);
    this.reset();
  }

  reset() {
    this.arr.set(Array.from({ length: 10 }).map((_, i) => ({ id: i, value: i })));
    this.elementRegistry.elements.clear();
  }

  trackByFn = (index: number, item: { id: number; value: number }) => {
    switch (this.trackingStrategy()) {
      case 'index':
        return index;
      case 'id':
        return item.id;
      case 'identity':
        return item;
    }
  };
}

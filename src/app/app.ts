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
  Injector,
  signal,
} from '@angular/core';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { FormsModule } from '@angular/forms';
import { MatToolbarModule } from '@angular/material/toolbar';
import { JsonPipe } from '@angular/common';
import { Router } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class ElementRegistry {
  elements = new Map<Element, string>();
}

@Directive({
  selector: '[tracked]',
})
export class Tracked {
  showHalo = signal(true);
  bindingUpdated = signal(true);

  private elementRegistry = inject(ElementRegistry);
  private eltRef = inject(ElementRef);

  constructor() {
    afterEveryRender(() => {
      const newText = this.getDomValue();
      const oldText = this.elementRegistry.elements.get(this.eltRef.nativeElement);
      if (newText !== oldText) {
        // Not using signals here to avoid triggering another CD cycle
        this.addClass('binding-highlight');
      }
    });
    afterNextRender(() => {
      // We need this to run after the first CD to read the DOM value.
      this.elementRegistry.elements.set(this.eltRef.nativeElement, this.getDomValue());

      this.addClass('halo-active');
    });
  }

  private addClass(className: string) {
    this.eltRef.nativeElement.classList.add(className);
    setTimeout(() => this.eltRef.nativeElement.classList.remove(className), 1000);
  }

  private getDomValue() {
    return (
      this.eltRef.nativeElement.innerText || this.eltRef.nativeElement.querySelector('input')?.value
    );
  }
}

@Component({
  selector: 'app-root',
  imports: [Tracked, MatButtonToggleModule, FormsModule, MatToolbarModule, JsonPipe],
  template: `
    <mat-toolbar color="primary">
      <div style="display: flex; align-items: center; gap: 10px;">
        <img src="favicon.ico" alt="Angular Logo" width="32" height="32" />
        <span>Angular - <code>&#64;for</code> tracking demo</span>
      </div>
      <span class="spacer"></span>
      <a href="#explanation" (click)="scrollToExplanation($event)" class="explanation-link"
        >See explanation</a
      >
    </mat-toolbar>

    <div class="main-layout">
      <div>
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
            #changeGroup="matButtonToggleGroup"
            (change)="onChangeStrategyChange(changeGroup.value)"
            [value]="changeStrategy()"
            aria-label="Change Strategy"
          >
            <mat-button-toggle value="increment">Increment</mat-button-toggle>
            <mat-button-toggle value="shuffle">Shuffle</mat-button-toggle>
          </mat-button-toggle-group>
        </div>
        <div class="demo-content">
          <div class="item-row">
            <pre>
          &commat;for(item of arr(); track {{trackingString()}}) &lcub;<br>
            @if(domStrategy() === 'stateless') {
            &nbsp; &nbsp; &lt;div&gt;&lcub;&ZeroWidthSpace;&lcub; item.value &rcub;&ZeroWidthSpace;&rcub;&lt;/div&gt;<br>
            } @else {
            &nbsp; &nbsp; &lt;input [value]="item.value" /&gt;<br>
            }
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
      </div>
      <div class="infobox">
        <h2>About {{ trackingStrategy() }} tracking</h2>
        @if (trackingStrategy() === 'index') {
          <p>
            When tracking by index, DOM elements are reused, and only their bindings are updated.
          </p>
          <p>You can observe that increment & shuffle scenarios behave similarly</p>
        } @else if (trackingStrategy() === 'identity') {
          <p>Identity tracking is highly dependent on how data is updated.</p>
          <p>
            When the data is immutable (like with the increment scenario), the reference of the
            changes resulting in every DOM node being trashed. With immutable data, this is often
            considered the worst strategy.
          </p>
          <p>In the shuffle scenario, we only move items around, so DOM nodes are reused</p>
        } @else {
          <p>
            When tracking by id (or any specific key), Angular is able to reuse DOM nodes even if
            the items are changed.
          </p>
          <p>
            In the increment scenario, only the last item is new (id not seen before), so only one
            DOM node is created, all the others don't even see their binding updated because they
            are entirely reused!
          </p>
          <p>
            In the shuffle scenario, we only move items around, so DOM nodes are reused and bindings
            do not need to be updated either
          </p>
        }
      </div>
    </div>

    <div class="toggle-container">
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

    <div class="explanation" id="explanation">
      <h2>Explanation</h2>
      <p>
        The demo aims to teach how the tracking strategy impacts the rendering of iterables (like
        arrays) by the <code>&#64;for</code> block.
      </p>
      <p>
        The array displayed in this demo is updated every 3 seconds (items are replaced) to showcase
        how Angular efficiently manages DOM updates.
        <br />
        The invariant here is that the template function (rendering the div) is executed every time,
        but its effect on the DOM will vary depending on the tracking strategy.<br />
        <br />
        Bindings & interpolations are always re-evaluated but Angular memoize them to avoid touching
        the DOM if the value did not change. The "binding updates" you will see highlighted in the
        demo are cases where Angular had to update the DOM because the value changed.
        <br /><br />
        When using the stateful DOM, you can judge how tracking impacts the focus for example
        <br /><br />
      </p>
    </div>
  `,
})
export class App {
  elementRegistry = inject(ElementRegistry);
  router = inject(Router);
  injector = inject(Injector);

  arr = signal(
    Array.from({ length: 10 }).map((_, i) => ({ id: i, value: i })),
    { equal: () => false },
  );

  private params = new URLSearchParams(window.location.search);
  trackingStrategy = signal<'index' | 'identity' | 'id'>(
    (this.params.get('tracking') as 'index' | 'identity' | 'id') || 'index',
  );
  domStrategy = signal<'stateless' | 'stateful'>(
    (this.params.get('dom') as 'stateless' | 'stateful') || 'stateless',
  );
  changeStrategy = signal<'increment' | 'shuffle'>(
    (this.params.get('change') as 'increment' | 'shuffle') || 'increment',
  );

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

  constructor() {
    effect(() => {
      this.reset();

      this.router.navigate([], {
        queryParams: {
          tracking: this.trackingStrategy(),
          dom: this.domStrategy(),
          change: this.changeStrategy(),
        },
        queryParamsHandling: 'merge',
      });
    });

    setInterval(() => {
      if (this.changeStrategy() === 'increment') {
        this.arr.set(this.arr().map((item) => ({ id: item.id + 1, value: item.value + 1 })));
      } else {
        const newArr = [...this.arr()].sort((a, b) => 0.5 - Math.random());
        this.arr.set(newArr);
      }
    }, 3000);
  }

  scrollToExplanation(event: Event) {
    event.preventDefault();
    document.querySelector('#explanation')?.scrollIntoView({ behavior: 'smooth' });
  }

  onTrackingStrategyChange(strategy: 'index' | 'identity' | 'id') {
    this.trackingStrategy.set(strategy);
  }

  onDomStrategyChange(strategy: 'stateless' | 'stateful') {
    this.domStrategy.set(strategy);
  }

  onChangeStrategyChange(strategy: 'increment' | 'shuffle') {
    this.changeStrategy.set(strategy);
  }

  reset() {
    // This is to force trash the DOM Items
    this.arr.set([]);
    afterNextRender(
      () => {
        this.arr.set(Array.from({ length: 10 }).map((_, i) => ({ id: i, value: i })));
      },
      { injector: this.injector },
    );
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

import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-hero',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './hero.component.html',
  styleUrl: './hero.component.css',
})
export class HeroComponent {
  @Input() heroVisible = false;
  @Input() heroSlide   = 0;
  @Input() heroSlides: { image: string; tag: string; title: string; productId?: number }[] = [];
  @Output() setSlide   = new EventEmitter<number>();
  @Output() browseCategoriesClick = new EventEmitter<void>();
  @Output() slideClicked = new EventEmitter<number>();  // ← ADD THIS

  scrollToCategories(): void {
    this.browseCategoriesClick.emit();
    const el = document.querySelector('#categories') ?? document.querySelector('app-categories');
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  onSlideClick(slide: any): void {
    if (slide.productId) {
      this.slideClicked.emit(slide.productId);  // ← ADD THIS
    }
  }
}
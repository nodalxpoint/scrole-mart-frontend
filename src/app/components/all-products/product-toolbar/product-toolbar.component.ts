// product-toolbar.component.ts
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-product-toolbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './product-toolbar.component.html',
  styleUrl: './product-toolbar.component.css',
})
export class ProductToolbarComponent {
  @Input() loading = false;
  @Input() totalElements = 0;
  @Input() viewMode: 'grid' | 'list' = 'grid';
  @Input() hasActiveFilters = false;
  @Input() activeFilterCount = 0;
  @Input() keyword = '';
  @Input() category = '';
  @Input() minPrice: number | null = null;
  @Input() maxPrice: number | null = null;

  @Output() filterToggle = new EventEmitter<void>();
  @Output() viewModeChange = new EventEmitter<'grid' | 'list'>();
  @Output() clearSearch = new EventEmitter<void>();
  @Output() clearCategory = new EventEmitter<void>();
  @Output() clearMinPrice = new EventEmitter<void>();
  @Output() clearMaxPrice = new EventEmitter<void>();
}
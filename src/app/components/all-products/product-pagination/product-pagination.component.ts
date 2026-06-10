// product-pagination.component.ts
import { Component, Input, Output, EventEmitter, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-product-pagination',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './product-pagination.component.html',
  styleUrl: './product-pagination.component.css',
})
export class ProductPaginationComponent implements OnChanges {
  @Input() currentPage = 0;
  @Input() totalPages = 0;

  @Output() pageChange = new EventEmitter<number>();

  pageNumbers: number[] = [];

  ngOnChanges(): void {
    this.buildPageNumbers();
  }

  buildPageNumbers(): void {
    const total = this.totalPages;
    const current = this.currentPage;
    const pages: number[] = [];

    if (total <= 7) {
      for (let i = 0; i < total; i++) pages.push(i);
    } else {
      pages.push(0);
      if (current > 2) pages.push(-1);
      for (let i = Math.max(1, current - 1); i <= Math.min(total - 2, current + 1); i++) pages.push(i);
      if (current < total - 3) pages.push(-1);
      pages.push(total - 1);
    }

    this.pageNumbers = pages;
  }
}
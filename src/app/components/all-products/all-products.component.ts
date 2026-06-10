// all-products.component.ts
import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { environment } from '../../../environments/environments';
import { CartService } from '../../services/cart.service';

import { ProductHeaderComponent } from './product-header/product-header.component';
import { ProductFilterSidebarComponent } from './product-filter-sidebar/product-filter-sidebar.component';
import { ProductToolbarComponent } from './product-toolbar/product-toolbar.component';
import { ProductCardComponent, Product, ProductVariant } from './product-card/product-card.component';
import { ProductPaginationComponent } from './product-pagination/product-pagination.component';

interface PageResponse {
  content: Product[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  last: boolean;
}

@Component({
  selector: 'app-all-products',
  standalone: true,
  imports: [
    CommonModule,
    ProductHeaderComponent,
    ProductFilterSidebarComponent,
    ProductToolbarComponent,
    ProductCardComponent,
    ProductPaginationComponent,
  ],
  templateUrl: './all-products.component.html',
  styleUrl: './all-products.component.css',
})
export class AllProductsComponent implements OnInit, OnDestroy {

  products: Product[] = [];
  loading = true;
  cardsVisible = false;

  // Pagination
  currentPage = 0;
  totalPages = 0;
  totalElements = 0;
  pageSize = 10;

  // Filters
  filters = {
    keyword: '',
    category: '',
    minPrice: null as number | null,
    maxPrice: null as number | null,
  };

  // UI state
  filterOpen = false;
  viewMode: 'grid' | 'list' = 'grid';
  categories: string[] = [];
  skeletonArr = Array(10).fill(0);

  // Per-product state maps
  private selectedVariants = new Map<number, ProductVariant>();
  private cartStates = new Map<number, 'idle' | 'loading' | 'added'>();
  private cartErrors = new Map<number, string>();
  private errorTimers = new Map<number, any>();
  private productQtys = new Map<number, number>();

  private searchSubject = new Subject<string>();
  private destroy$ = new Subject<void>();

  constructor(
    private http: HttpClient,
    private router: Router,
    private cartService: CartService
  ) {}

  ngOnInit(): void {
    this.loadProducts();

    this.searchSubject.pipe(
      debounceTime(600),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.currentPage = 0;
      this.loadProducts();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  @HostListener('document:keydown.escape')
  onEscKey(): void {
    this.filterOpen = false;
  }

  onPageClick(_event: Event): void {}

  // ─────────────────────────────────────────────
  // LOAD
  // ─────────────────────────────────────────────

  loadProducts(): void {
    this.loading = true;
    this.cardsVisible = false;

    let params = new HttpParams()
      .set('page', String(this.currentPage))
      .set('size', String(this.pageSize));

    if (this.filters.keyword)  params = params.set('keyword', this.filters.keyword);
    if (this.filters.category) params = params.set('category', this.filters.category);
    if (this.filters.minPrice != null) params = params.set('minPrice', String(this.filters.minPrice));
    if (this.filters.maxPrice != null) params = params.set('maxPrice', String(this.filters.maxPrice));

    this.http.get<PageResponse>(`${environment.apiUrl}/product/getallproducts`, { params })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.products = res.content;
          this.totalElements = res.totalElements;
          this.totalPages = res.totalPages;
          this.currentPage = res.number;
          this.extractCategories(res.content);
          this.loading = false;
          setTimeout(() => (this.cardsVisible = true), 60);
        },
        error: () => {
          this.loading = false;
          this.products = [];
        }
      });
  }

  // ─────────────────────────────────────────────
  // FILTERS
  // ─────────────────────────────────────────────

  onSearchInput(keyword: string): void {
    this.filters.keyword = keyword;
    this.searchSubject.next(keyword);
  }

  clearSearch(): void {
    this.filters.keyword = '';
    this.currentPage = 0;
    this.loadProducts();
  }

  setCategory(cat: string): void {
    this.filters.category = cat;
    this.currentPage = 0;
    this.loadProducts();
  }

  applyFilters(): void {
    this.currentPage = 0;
    this.loadProducts();
  }

  clearAllFilters(): void {
    this.filters = { keyword: '', category: '', minPrice: null, maxPrice: null };
    this.currentPage = 0;
    this.loadProducts();
  }

  onPriceChange(event: { min: number | null; max: number | null }): void {
    this.filters.minPrice = event.min;
    this.filters.maxPrice = event.max;
    this.applyFilters();
  }

  get hasActiveFilters(): boolean {
    return !!(
      this.filters.keyword ||
      this.filters.category ||
      this.filters.minPrice != null ||
      this.filters.maxPrice != null
    );
  }

  get activeFilterCount(): number {
    let count = 0;
    if (this.filters.keyword) count++;
    if (this.filters.category) count++;
    if (this.filters.minPrice != null) count++;
    if (this.filters.maxPrice != null) count++;
    return count;
  }

  // ─────────────────────────────────────────────
  // PAGINATION
  // ─────────────────────────────────────────────

  goToPage(page: number): void {
    if (page < 0 || page >= this.totalPages) return;
    this.currentPage = page;
    this.loadProducts();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ─────────────────────────────────────────────
  // PRODUCT HELPERS
  // ─────────────────────────────────────────────

  getProductImage(product: Product): string {
    if (!product.productImages?.length) return '';
    const url = product.productImages[0].imageUrl;
    if (url.startsWith('http')) return url;
    return `${environment.imageBaseUrl}${url}`;
  }

  isFullyOutOfStock(product: Product): boolean {
    const variants = product.variants;
    if (!variants?.length) return false;
    return variants.every(v => v.stock === 0);
  }

  isNew(createdAt: string): boolean {
    if (!createdAt) return false;
    const diffDays = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24);
    return diffDays <= 30;
  }

  goToProduct(id: number): void {
    this.router.navigate(['/products', id]);
  }

  private extractCategories(products: Product[]): void {
    const seen = new Set<string>();
    products.forEach(p => { if (p.category?.name) seen.add(p.category.name); });
    this.categories = Array.from(new Set([...this.categories, ...seen]));
  }

  // ─────────────────────────────────────────────
  // VARIANT
  // ─────────────────────────────────────────────

  selectVariantBySize(productId: number, size: string, variants: ProductVariant[]): void {
    const variant = variants.find(v => v.size === size);
    if (variant) {
      this.selectedVariants.set(productId, variant);
      this.cartStates.set(productId, 'idle');
      this.cartErrors.delete(productId);
    }
  }

  getSelectedVariantSize(productId: number): string {
    return this.selectedVariants.get(productId)?.size ?? '';
  }

  getSelectedVariantId(productId: number): number | null {
    return this.selectedVariants.get(productId)?.id ?? null;
  }

  getSelectedVariant(productId: number): ProductVariant | null {
    return this.selectedVariants.get(productId) ?? null;
  }

  getSelectedPrice(product: Product): string {
    const sv = this.selectedVariants.get(product.id);
    if (sv) return `₹${sv.price}`;
    const prices = product.variants?.map(v => v.price) ?? [];
    if (!prices.length) return '';
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    return min === max ? `₹${min}` : `₹${min} – ₹${max}`;
  }

  // ─────────────────────────────────────────────
  // QUANTITY
  // ─────────────────────────────────────────────

  getQty(productId: number): number {
    return this.productQtys.get(productId) ?? 1;
  }

  incrementQty(productId: number): void {
    const sv = this.selectedVariants.get(productId);
    const max = sv?.stock ?? 99;
    const current = this.getQty(productId);
    if (current < max) this.productQtys.set(productId, current + 1);
  }

  decrementQty(productId: number): void {
    const current = this.getQty(productId);
    if (current > 1) this.productQtys.set(productId, current - 1);
  }

  // ─────────────────────────────────────────────
  // CART
  // ─────────────────────────────────────────────

  getCartState(productId: number): 'idle' | 'loading' | 'added' {
    return this.cartStates.get(productId) ?? 'idle';
  }

  getCartError(productId: number): string {
    return this.cartErrors.get(productId) ?? '';
  }

  onAddToCart(product: Product): void {
    const variant = this.selectedVariants.get(product.id);
    if (!variant || this.cartStates.get(product.id) !== 'idle') return;

    const qty = this.getQty(product.id);
    this.cartStates.set(product.id, 'loading');
    this.cartErrors.delete(product.id);

    this.cartService.addItem(variant.id!, qty).subscribe({
      next: () => {
        this.cartStates.set(product.id, 'added');
        this.productQtys.set(product.id, 1);
        const t = setTimeout(() => {
          this.cartStates.set(product.id, 'idle');
        }, 2200);
        this.errorTimers.set(product.id, t);
      },
      error: (err: any) => {
        this.cartStates.set(product.id, 'idle');
        const msg = err?.error?.message || err?.error?.error || 'Could not add to cart';
        this.cartErrors.set(product.id, msg);
        const t = setTimeout(() => this.cartErrors.delete(product.id), 3500);
        this.errorTimers.set(product.id, t);
      }
    });
  }
}
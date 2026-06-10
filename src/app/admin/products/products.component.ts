// admin/products/products.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environments';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';

import { Product, Category, ProductPage, ProductFilters, ProductFormData } from '../../models/product.model';
import { ProductFiltersComponent }     from './product-filters/product-filters.component';
import { ProductTableComponent }       from './product-table/product-table.component';
import { ProductDetailModalComponent } from './product-detail-modal/product-detail-modal.component';
import { ProductFormModalComponent }   from './product-form-modal/product-form-modal.component';

@Component({
  selector: 'app-admin-products',
  standalone: true,
  imports: [CommonModule, ProductFiltersComponent, ProductTableComponent, ProductDetailModalComponent, ProductFormModalComponent],
  templateUrl: './products.component.html',
  styleUrl: './products.component.css'
})
export class AdminProductsComponent implements OnInit, OnDestroy {

  private destroy$      = new Subject<void>();
  private searchSubject = new Subject<string>();

  // ── Data ──
  products:   Product[]  = [];
  categories: Category[] = [];

  // ── State ──
  loading = true;
  saving  = false;
  error   = '';

  // ── Filters ──
  filters: ProductFilters = { searchQuery: '', filterCategory: '', filterTrending: '', filterStatus: '' };

  // ── Sort ──
  sortField: 'name' | 'price' | 'stock' = 'name';
  sortDir:   'asc' | 'desc'             = 'asc';

  // ── Pagination ──
  currentPage:   number   = 1;
  pageSize:      number   = 10;
  totalPages:    number   = 1;
  totalElements: number   = 0;
  startIndex:    number   = 0;
  endIndex:      number   = 0;
  pageNumbers:   number[] = [];

  // ── Modals ──
  showDetails      = false;
  showForm         = false;
  selectedProduct: Product | null = null;
  editingProduct:  Product | null = null;

  // ── Delete Confirm Popup ─────────────────────────────────────
  showDeleteConfirm   = false;
  private pendingDeleteId:   number  = 0;
  private pendingDeleteName: string  = '';

  get deleteProductName(): string { return this.pendingDeleteName; }

  // ── Success Toast ────────────────────────────────────────────
  showToast       = false;
  toastTitle      = '';
  toastSub        = '';
  toastType: 'success' | 'delete' = 'success';
  private toastTimer: any;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.searchSubject.pipe(
      debounceTime(500),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.currentPage = 1;
      this.loadProducts();
    });

    this.loadProducts();
    this.loadCategories();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    clearTimeout(this.toastTimer);
  }

  // ─────────────────────────────────────────────
  // TOAST HELPER
  // ─────────────────────────────────────────────

  private showToastMsg(title: string, sub: string, type: 'success' | 'delete'): void {
    this.toastTitle = title;
    this.toastSub   = sub;
    this.toastType  = type;
    this.showToast  = true;
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => { this.showToast = false; }, 3500);
  }

  closeToast(): void {
    this.showToast = false;
    clearTimeout(this.toastTimer);
  }

  // ─────────────────────────────────────────────
  // API CALLS
  // ─────────────────────────────────────────────

  loadProducts(): void {
    this.loading = true;

    let params = new HttpParams()
      .set('page', String(this.currentPage - 1))
      .set('size', String(this.pageSize))
      .set('sort', `${this.sortField},${this.sortDir}`);

    if (this.filters.searchQuery.trim())  params = params.set('keyword',  this.filters.searchQuery.trim());
    if (this.filters.filterCategory)      params = params.set('category', this.filters.filterCategory);
    if (this.filters.filterTrending)      params = params.set('trending', this.filters.filterTrending);
    if (this.filters.filterStatus)        params = params.set('status',   this.filters.filterStatus);

    this.http
      .get<ProductPage>(`${environment.apiUrl}/admin/getallproducts`, { headers: this.authHeaders(), params })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.products      = res.content;
          this.totalElements = res.totalElements;
          this.totalPages    = res.totalPages;
          this.startIndex    = (this.currentPage - 1) * this.pageSize;
          this.endIndex      = this.startIndex + res.content.length;
          this.buildPageNumbers();
          this.loading = false;
        },
        error: () => {
          this.error   = 'Failed to load products.';
          this.loading = false;
        }
      });
  }

  loadCategories(): void {
    this.http
      .get<Category[]>(`${environment.apiUrl}/categories/getAllCategories`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next:  (res) => { this.categories = res; },
        error: ()    => { console.warn('Could not load categories'); }
      });
  }

  // ─────────────────────────────────────────────
  // FILTER / SEARCH / SORT
  // ─────────────────────────────────────────────

  onFiltersChange(newFilters: ProductFilters): void {
    const prevQuery = this.filters.searchQuery.trim();
    const newQuery  = newFilters.searchQuery.trim();
    this.filters = { ...newFilters };

    if (prevQuery !== newQuery) {
      this.searchSubject.next(newQuery);
    } else {
      this.currentPage = 1;
      this.loadProducts();
    }
  }

  onClearAllFilters(): void {
    this.filters     = { searchQuery: '', filterCategory: '', filterTrending: '', filterStatus: '' };
    this.currentPage = 1;
    this.loadProducts();
  }

  onSort(field: 'name' | 'price' | 'stock'): void {
    this.sortDir     = this.sortField === field && this.sortDir === 'asc' ? 'desc' : 'asc';
    this.sortField   = field;
    this.currentPage = 1;
    this.loadProducts();
  }

  // ─────────────────────────────────────────────
  // PAGINATION
  // ─────────────────────────────────────────────

  onPageChange(page: number): void {
    if (page < 1 || page > this.totalPages || page === this.currentPage) return;
    this.currentPage = page;
    this.loadProducts();
  }

  onPageSizeChange(size: number): void {
    this.pageSize    = Number(size);
    this.currentPage = 1;
    this.loadProducts();
  }

  // ─────────────────────────────────────────────
  // MODALS
  // ─────────────────────────────────────────────

  openDetails(product: Product): void { this.selectedProduct = product; this.showDetails = true; }
  openAddForm(): void                  { this.editingProduct = null; this.showForm = true; }
  openEditForm(product: Product): void { this.editingProduct = product; this.showDetails = false; this.showForm = true; }
  closeForm(): void                    { this.showForm = false; this.editingProduct = null; this.error = ''; }

  // ─────────────────────────────────────────────
  // SAVE
  // ─────────────────────────────────────────────

  onFormSubmit(data: {
    formData:        ProductFormData;
    selectedFiles:   File[];
    deleteImageIds:  number[];
    primaryImageId:  number | null;
    reorderedImages: { id: number }[];
  }): void {
    const { formData } = data;

    if (!formData.name.trim() || !formData.categoryId) {
      this.error = 'Please fill all required fields (Name, Category)'; return;
    }
    if (!formData.variants.length) {
      this.error = 'Kam se kam ek size variant add karo'; return;
    }
    if (formData.variants.some(v => !v.size || !v.price)) {
      this.error = 'Har variant me size aur price required hai'; return;
    }

    this.saving = true;
    this.error  = '';

    const isEdit  = !!this.editingProduct;
    const pName   = formData.name.trim();

    const payload = new FormData();
    payload.append('product', JSON.stringify({
      name:        pName,
      description: formData.description.trim(),
      categoryId:  Number(formData.categoryId),
      trending:    formData.trending,
      isActive:    formData.isActive,
      variants:    formData.variants.map(v => ({
        ...(v.id ? { id: v.id } : {}),
        size:  v.size.trim(),
        price: Number(v.price),
        stock: Number(v.stock),
      })),
    }));

    data.selectedFiles.forEach(file => payload.append('images', file));

    const url = isEdit
      ? `${environment.apiUrl}/admin/updateproduct/${this.editingProduct!.id}`
      : `${environment.apiUrl}/admin/addproducts`;

    if (isEdit) {
      if (data.primaryImageId)        payload.append('primaryImageId', String(data.primaryImageId));
      if (data.deleteImageIds.length) payload.append('deleteImageIds', data.deleteImageIds.join(','));
    }

    this.http.post<Product>(url, payload, { headers: this.authHeaders() })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.saving = false;
          this.closeForm();
          this.loadProducts();
          this.showToastMsg(
            isEdit ? 'Product updated!' : 'Product added!',
            isEdit ? `"${pName}" has been updated successfully.` : `"${pName}" is now live.`,
            'success'
          );
        },
        error: (err) => {
          this.saving = false;
          this.error  = err.error?.message || (isEdit ? 'Failed to update product' : 'Failed to add product');
        }
      });
  }

  // ─────────────────────────────────────────────
  // DELETE
  // ─────────────────────────────────────────────

  deleteProduct(id: number): void {
    const product = this.products.find(p => p.id === id);
    this.pendingDeleteId   = id;
    this.pendingDeleteName = product?.name ?? 'this product';
    this.showDeleteConfirm = true;
  }

  cancelDelete(): void {
    this.showDeleteConfirm = false;
    this.pendingDeleteId   = 0;
    this.pendingDeleteName = '';
  }

  confirmDelete(): void {
    const id   = this.pendingDeleteId;
    const name = this.pendingDeleteName;
    this.showDeleteConfirm = false;
    this.pendingDeleteId   = 0;
    this.pendingDeleteName = '';

    this.http.delete(
      `${environment.apiUrl}/admin/deleteproduct/${id}`,
      { headers: this.authHeaders(), responseType: 'text' }
    ).pipe(takeUntil(this.destroy$))
     .subscribe({
       next: () => {
         this.loadProducts();
         this.showToastMsg('Product deleted', `"${name}" has been removed.`, 'delete');
       },
       error: () => { this.error = 'Failed to delete product.'; }
     });
  }

  // ─────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────

  private buildPageNumbers(): void {
    const total = this.totalPages, cur = this.currentPage;
    const pages: number[] = [];

    if (total <= 7) {
      for (let i = 1; i <= total; i++) pages.push(i);
    } else {
      pages.push(1);
      if (cur > 3) pages.push(-1);
      for (let i = Math.max(2, cur - 1); i <= Math.min(total - 1, cur + 1); i++) pages.push(i);
      if (cur < total - 2) pages.push(-1);
      pages.push(total);
    }

    this.pageNumbers = pages;
  }

  private authHeaders(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${localStorage.getItem('admin_token')}` });
  }
}
// src/app/admin/delivered/delivered-orders/delivered-orders.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule }                 from '@angular/common';
import { FormsModule }                  from '@angular/forms';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Router }                       from '@angular/router';
import { Subject }                      from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { environment }                  from '../../../../environments/environments';

export interface OrderSummaryDto {
  orderId:         number;
  name:            string;
  phone:           number | null;
  amount:          number;
  paymentStatus:   string;
  orderStatus:     string;
  email:           string | null;
  trckngKey:       string | null;
  dtOfOps?:        number;
  updatedDtOfOps?: number;
}

interface PageResponse<T> {
  content:       T[];
  totalElements: number;
  totalPages:    number;
  number:        number;
  size:          number;
}

@Component({
  selector:    'app-delivered-orders',
  standalone:  true,
  imports:     [CommonModule, FormsModule],
  templateUrl: './delivered-orders.component.html',
  styleUrl:    './delivered-orders.component.css'
})
export class DeliveredOrdersComponent implements OnInit, OnDestroy {

  allOrders:   OrderSummaryDto[] = [];
  pagedOrders: OrderSummaryDto[] = [];

  loading       = true;
  searchLoading = false;
  error         = '';

  searchQuery  = '';
  isSearchMode = false;

  sortField: 'orderId' | 'amount' | 'dtOfOps' = 'dtOfOps';
  sortDir:   'asc' | 'desc'                    = 'desc';

  currentPage   = 0;
  pageSize      = 10;
  totalPages    = 1;
  totalElements = 0;
  startIndex    = 0;
  endIndex      = 0;
  pageNumbers:  number[] = [];

  copiedKey = '';

  private searchSubject = new Subject<string>();

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit(): void {
    this.loadOrders();

    this.searchSubject.pipe(
      debounceTime(400),
      distinctUntilChanged()
    ).subscribe(query => {
      this.currentPage = 0;
      if (query.trim()) {
        this.searchOrders(query.trim());
      } else {
        this.isSearchMode = false;
        this.loadOrders();
      }
    });
  }

  ngOnDestroy(): void { this.searchSubject.complete(); }

  // ── Normal list ──────────────────────────────────────────────

  loadOrders(): void {
    this.loading      = true;
    this.isSearchMode = false;
    this.error        = '';

    const params = new HttpParams()
      .set('status', 'DELIVERED')
      .set('page', String(this.currentPage))
      .set('size', String(this.pageSize));

    this.http.get<PageResponse<OrderSummaryDto>>(
      `${environment.apiUrl}/admin/orders`,
      { headers: this.authHeaders(), params }
    ).subscribe({
      next: (res) => {
        this.allOrders     = res.content;
        this.totalElements = res.totalElements;
        this.totalPages    = res.totalPages;
        this.startIndex    = this.currentPage * this.pageSize;
        this.endIndex      = this.startIndex + res.content.length;
        this.applySort();
        this.buildPageNumbers();
        this.loading = false;
      },
      error: (err) => {
        this.error   = err.error?.message || 'Failed to load delivered orders.';
        this.loading = false;
      }
    });
  }

  // ── Search API — GET /admin/orders?trckngKey=...&status=DELIVERED ──

  private searchOrders(keyword: string): void {
    this.searchLoading = true;
    this.error         = '';

    const params = new HttpParams()
      .set('trckngKey', keyword)
      .set('status', 'DELIVERED')
      .set('page', String(this.currentPage))
      .set('size', String(this.pageSize));

    this.http.get<PageResponse<OrderSummaryDto>>(
      `${environment.apiUrl}/admin/orders`,
      { headers: this.authHeaders(), params }
    ).subscribe({
      next: (res) => {
        this.isSearchMode  = true;
        this.allOrders     = res.content;
        this.totalElements = res.totalElements;
        this.totalPages    = res.totalPages;
        this.startIndex    = this.currentPage * this.pageSize;
        this.endIndex      = this.startIndex + res.content.length;
        this.applySort();
        this.buildPageNumbers();
        this.searchLoading = false;
      },
      error: (err) => {
        this.error         = err.error?.message || 'Search failed.';
        this.searchLoading = false;
      }
    });
  }

  onSearchInput(): void { this.searchSubject.next(this.searchQuery); }

  clearSearch(): void {
    this.searchQuery  = '';
    this.isSearchMode = false;
    this.currentPage  = 0;
    this.loadOrders();
  }

  // ── Sort ─────────────────────────────────────────────────────

  applySort(): void {
    const list = [...this.allOrders];
    list.sort((a, b) => {
      let va: any, vb: any;
      if (this.sortField === 'orderId') { va = a.orderId;      vb = b.orderId; }
      if (this.sortField === 'amount')  { va = a.amount;       vb = b.amount; }
      if (this.sortField === 'dtOfOps') { va = a.dtOfOps ?? 0; vb = b.dtOfOps ?? 0; }
      return this.sortDir === 'asc'
        ? (va < vb ? -1 : va > vb ? 1 : 0)
        : (va > vb ? -1 : va < vb ? 1 : 0);
    });
    this.pagedOrders = list;
  }

  sort(field: 'orderId' | 'amount' | 'dtOfOps'): void {
    this.sortDir   = this.sortField === field && this.sortDir === 'asc' ? 'desc' : 'asc';
    this.sortField = field;
    this.applySort();
  }

  // ── Date helper ──────────────────────────────────────────────

  formatDtOfOps(val: number | undefined | null): string {
    if (!val) return '—';
    const s = String(val);
    const d = new Date(`${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6,8)}`);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  // ── Copy tracking key ────────────────────────────────────────

  copyTrackingKey(event: MouseEvent, key: string): void {
    event.stopPropagation();
    if (!key) return;
    navigator.clipboard.writeText(key).then(() => {
      this.copiedKey = key;
      setTimeout(() => { this.copiedKey = ''; }, 2000);
    });
  }

  // ── Pagination ───────────────────────────────────────────────

  goToPage(page: number): void {
    if (page < 0 || page >= this.totalPages) return;
    this.currentPage = page;
    if (this.isSearchMode && this.searchQuery.trim()) {
      this.searchOrders(this.searchQuery.trim());
    } else {
      this.loadOrders();
    }
  }

  onPageSizeChange(): void { this.currentPage = 0; this.loadOrders(); }

  private buildPageNumbers(): void {
    const total = this.totalPages, cur = this.currentPage;
    const pages: number[] = [];
    if (total <= 7) { for (let i = 0; i < total; i++) pages.push(i); }
    else {
      pages.push(0);
      if (cur > 2) pages.push(-1);
      for (let i = Math.max(1, cur - 1); i <= Math.min(total - 2, cur + 1); i++) pages.push(i);
      if (cur < total - 3) pages.push(-1);
      pages.push(total - 1);
    }
    this.pageNumbers = pages;
  }

  // ── Helpers ──────────────────────────────────────────────────

  openDetail(order: OrderSummaryDto): void {
    this.router.navigate(['/admin/delivered', order.orderId]);
  }

  displayPage(p: number): number { return p + 1; }

  private authHeaders(): HttpHeaders {
    const token = localStorage.getItem('admin_token') || '';
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }
}
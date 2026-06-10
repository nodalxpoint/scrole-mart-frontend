// src/app/admin/cancelled/cancelled-orders/cancelled-orders.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule }      from '@angular/common';
import { FormsModule }       from '@angular/forms';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Router }            from '@angular/router';
import { environment }       from '../../../../environments/environments';

export interface OrderSummaryDto {
  orderId:          number;
  name:             string;
  phone:            number | null;
  amount:           number;
  paymentStatus:    string;
  orderStatus:      string;
  dtOfOps:          number | null;      // e.g. 20260305
  updatedDtOfOps:   number | null;
  email:            string | null;
  trckngKey?:       string;
}

interface PageResponse<T> {
  content:       T[];
  totalElements: number;
  totalPages:    number;
  number:        number;
  size:          number;
}

type StatusFilter = 'cancelled' | 'refund';

@Component({
  selector:    'app-cancelled-orders',
  standalone:  true,
  imports:     [CommonModule, FormsModule],
  templateUrl: './cancelled-orders.component.html',
  styleUrl:    './cancelled-orders.component.css'
})
export class CancelledOrdersComponent implements OnInit {

  allOrders:   OrderSummaryDto[] = [];
  pagedOrders: OrderSummaryDto[] = [];

  loading = true;
  error   = '';

  searchQuery  = '';
  statusFilter: StatusFilter = 'refund';   // ← default: REFUNDED pehle dikhega

  sortField: 'orderId' | 'amount' | 'dtOfOps' = 'dtOfOps';
  sortDir:   'asc' | 'desc'                    = 'desc';

  currentPage   = 0;
  pageSize      = 10;
  totalPages    = 1;
  totalElements = 0;
  startIndex    = 0;
  endIndex      = 0;
  pageNumbers:  number[] = [];

  copiedKey: string | null = null;   // for copy feedback

  private searchDebounce: any = null;

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit(): void { this.loadOrders(); }

  // ── Tab switch ─────────────────────────────────────────────────────────────
  setFilter(f: StatusFilter): void {
    if (this.statusFilter === f) return;
    this.statusFilter = f;
    this.currentPage  = 0;
    this.searchQuery  = '';
    this.loadOrders();
  }

  // ── Search input handler (debounced backend call) ──────────────────────────
  onSearchInput(): void {
    clearTimeout(this.searchDebounce);
    this.searchDebounce = setTimeout(() => {
      this.currentPage = 0;
      this.loadOrders();
    }, 400);
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.currentPage = 0;
    this.loadOrders();
  }

  // ── Load orders from backend ───────────────────────────────────────────────
  loadOrders(): void {
    this.loading = true;
    this.error   = '';

    const statusParam = this.statusFilter === 'refund' ? 'REFUNDED' : 'CANCELLED';

    let params = new HttpParams()
      .set('status', statusParam)
      .set('page',   String(this.currentPage))
      .set('size',   String(this.pageSize));

    // If search query present → send as trckngKey param (backend search)
    if (this.searchQuery.trim()) {
      params = params.set('trckngKey', this.searchQuery.trim());
    }

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
        this.applyFilters();
        this.buildPageNumbers();
        this.loading = false;
      },
      error: (err) => {
        this.error   = err.error?.message || 'Failed to load orders.';
        this.loading = false;
      }
    });
  }

  // ── Client-side sort only (search is now server-side) ─────────────────────
  applyFilters(): void {
    let list = [...this.allOrders];
    list.sort((a, b) => {
      let va: any, vb: any;
      if (this.sortField === 'orderId') { va = a.orderId; vb = b.orderId; }
      if (this.sortField === 'amount')  { va = a.amount;  vb = b.amount; }
      if (this.sortField === 'dtOfOps') { va = a.dtOfOps ?? 0; vb = b.dtOfOps ?? 0; }
      return this.sortDir === 'asc' ? (va < vb ? -1 : va > vb ? 1 : 0)
                                    : (va > vb ? -1 : va < vb ? 1 : 0);
    });
    this.pagedOrders = list;
  }

  sort(field: 'orderId' | 'amount' | 'dtOfOps'): void {
    this.sortDir   = (this.sortField === field && this.sortDir === 'asc') ? 'desc' : 'asc';
    this.sortField = field;
    this.applyFilters();
  }

  // ── dtOfOps parser: 20260305 → Date object ────────────────────────────────
  parseDtOfOps(dtOfOps: number | null): Date | null {
    if (!dtOfOps) return null;
    const s   = String(dtOfOps);          // "20260305"
    const yr  = +s.slice(0, 4);
    const mo  = +s.slice(4, 6) - 1;       // 0-indexed month
    const day = +s.slice(6, 8);
    return new Date(yr, mo, day);
  }

  // ── Copy tracking key ──────────────────────────────────────────────────────
  copyTrackingKey(event: MouseEvent, key: string): void {
    event.stopPropagation();
    navigator.clipboard.writeText(key).then(() => {
      this.copiedKey = key;
      setTimeout(() => { this.copiedKey = null; }, 1800);
    });
  }

  // ── Pagination ─────────────────────────────────────────────────────────────
  goToPage(page: number): void {
    if (page < 0 || page >= this.totalPages) return;
    this.currentPage = page;
    this.loadOrders();
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

  openDetail(order: OrderSummaryDto): void {
    this.router.navigate(['/admin/cancelled', order.orderId]);
  }

  displayPage(p: number): number { return p + 1; }

  private authHeaders(): HttpHeaders {
    const token = localStorage.getItem('admin_token') || '';
    return new HttpHeaders({ 'Authorization': `Bearer ${token}` });
  }
}
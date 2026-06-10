// src/app/services/product.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { Product } from '../models/product.model';
import { environment } from '../../environments/environments';

export interface ProductPage {
  content: Product[];
  totalElements: number;
  totalPages: number;
  number: number;        // current page
  size: number;
}

export interface ProductFilterParams {
  keyword?:  string | null;
  category?: string | null;
  minPrice?: number | null;
  maxPrice?: number | null;
  page?:     number;
  size?:     number;
}

@Injectable({ providedIn: 'root' })
export class ProductService {

  constructor(private http: HttpClient) {}

  // Trending products
  getTrendingProducts(): Observable<Product[]> {
    return this.http.get<Product[]>(`${environment.apiUrl}/product/trending`);
  }

  // Latest / New Arrivals
  getRecentProducts(): Observable<Product[]> {
    return this.http.get<Product[]>(`${environment.apiUrl}/product/latest`);
  }

  /**
   * All-products page ke liye — supports keyword / category / price filter + pagination
   * Backend: GET /api/product/getallproducts
   */
  filterProducts(filters: ProductFilterParams = {}): Observable<ProductPage> {
    let params = new HttpParams();

    if (filters.keyword?.trim())  params = params.set('keyword',  filters.keyword.trim());
    if (filters.category?.trim()) params = params.set('category', filters.category.trim());
    if (filters.minPrice != null) params = params.set('minPrice', filters.minPrice.toString());
    if (filters.maxPrice != null) params = params.set('maxPrice', filters.maxPrice.toString());

    params = params.set('page', (filters.page ?? 0).toString());
    params = params.set('size', (filters.size ?? 10).toString());

    return this.http.get<ProductPage>(
      `${environment.apiUrl}/product/getallproducts`,
      { params }
    );
  }

  // ✅ FIXED: Correct backend endpoint
  getProductById(id: number): Observable<Product> {
    return this.http.get<Product>(`${environment.apiUrl}/product/getProductById/${id}`);
  }

  // Related products — same category ke products
  getProductsByCategory(categoryId: number): Observable<Product[]> {
    return this.http.get<Product[]>(`${environment.apiUrl}/product/by-category/${categoryId}`);
  }

  // Create product
  createProduct(formData: FormData): Observable<Product> {
    return this.http.post<Product>(`${environment.apiUrl}/admin/addproducts`, formData);
  }

  // Update product
  updateProduct(id: number, formData: FormData): Observable<any> {
    return this.http.post(`${environment.apiUrl}/admin/updateproduct/${id}`, formData);
  }

  // Delete product
  deleteProduct(id: number): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/admin/product/${id}`);
  }

  // ─── Reviews ────────────────────────────────

  getReviewsByProduct(productId: number): Observable<any[]> {
    return of([]);
  }

  submitReview(payload: {
    productId: number;
    reviewerName: string;
    reviewMsg: string;
    rating: number;
  }): Observable<string> {
    return this.http.post(`${environment.apiUrl}/review/post-review`, payload, {
      responseType: 'text'
    });
  }
}
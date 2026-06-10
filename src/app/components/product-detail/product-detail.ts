// product-detail.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule }      from '@angular/common';
import { RouterLink }        from '@angular/router';
import { FormsModule }       from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ProductService }    from '../../services/product.service';
import { Product }           from '../../models/product.model';
import { environment }       from '../../../environments/environments';
import { CartService } from '../../services/cart.service';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './product-detail.html',
  styleUrl: './product-detail.css'
})
export class ProductDetail implements OnInit {

  product:      any | null = null;
  loading       = true;
  error         = false;
  pageVisible   = false;

  images:           string[] = [];
  currentProductId: number = 0;   // route param se store karenge
  activeImage:      string   = '';
  activeImageIndex: number   = 0;
  isZoomed        = false;

  sizes:  string[] = [];
  selectedSize  = '';
  selectedColor = '';
  qty           = 1;

  addedToCart     = false;
  relatedProducts: any[] = [];
  isNew           = false;

  // ─── Review State ────────────────────────────
  reviews:         any[] = [];
  reviewsLoading   = false;

  reviewForm = {
    reviewerName: '',
    reviewMsg:    '',
    rating:       0,
  };
  hoverRating      = 0;
  reviewSubmitting = false;
  reviewSubmitted  = false;
  reviewError      = '';

  constructor(
    private route:          ActivatedRoute,
    private router:         Router,
    private productService: ProductService,
    private cartService:    CartService, 
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      const id = params['id'];
      if (id) {
        this.resetState();
        this.loadProduct(Number(id));
      }
    });
  }

  // ─────────────────────────────────────────────
  // DATA LOADING
  // ─────────────────────────────────────────────

  private resetState(): void {
    this.product          = null;
    this.loading          = true;
    this.error            = false;
    this.pageVisible      = false;
    this.activeImageIndex = 0;
    this.qty              = 1;
    this.selectedSize     = '';
    this.selectedColor    = '';
    this.addedToCart      = false;
    this.relatedProducts  = [];
    this.images           = [];
    this.activeImage      = '';
    this.sizes            = [];
    this.reviews          = [];
    this.reviewSubmitted  = false;
    this.reviewForm       = { reviewerName: '', reviewMsg: '', rating: 0 };
    this.hoverRating      = 0;
  }

  private loadProduct(id: number): void {
    this.currentProductId = id;
    this.productService.getProductById(id).subscribe({
      next: (product: any) => {
        this.product = product;
        this.setupImages(product);
        this.setupVariants(product);
        this.checkIfNew(product);

        // ✅ Reviews directly product response se — alag API call nahi
        this.reviews = Array.isArray(product.reviews) ? product.reviews : [];

        this.loading = false;
        setTimeout(() => (this.pageVisible = true), 80);
      },
      error: (err: any) => {
        console.error('Product load error:', err);
        this.loading = false;
        this.error   = true;
      }
    });
  }

  // ─────────────────────────────────────────────
  // REVIEWS
  // ─────────────────────────────────────────────

  setRating(star: number): void { this.reviewForm.rating = star; }
  setHover(star: number):  void { this.hoverRating = star; }
  clearHover():            void { this.hoverRating = 0; }

  getStarState(star: number): 'filled' | 'hover' | 'empty' {
    const active = this.hoverRating || this.reviewForm.rating;
    if (star <= active) return this.hoverRating && star <= this.hoverRating ? 'hover' : 'filled';
    return 'empty';
  }

  submitReview(): void {
    this.reviewError = '';

    if (!this.reviewForm.reviewerName.trim()) {
      this.reviewError = 'Please enter your name.';
      return;
    }
    if (!this.reviewForm.rating) {
      this.reviewError = 'Please select a star rating.';
      return;
    }
    if (!this.reviewForm.reviewMsg.trim()) {
      this.reviewError = 'Please write a review message.';
      return;
    }

    // ✅ Exact payload jo backend expect karta hai
    const payload = {
      productId:    this.currentProductId,
      reviewerName: this.reviewForm.reviewerName.trim(),
      reviewMsg:    this.reviewForm.reviewMsg.trim(),
      rating:       this.reviewForm.rating,
    };

    this.reviewSubmitting = true;

    this.productService.submitReview(payload).subscribe({
      next: () => {
        this.reviewSubmitting = false;
        this.reviewSubmitted  = true;
        // Optimistically add to top of list so user sees it immediately
        this.reviews = [
          {
            reviewerName: payload.reviewerName,
            reviewMsg:    payload.reviewMsg,
            rating:       payload.rating,
            createdAt:    new Date().toISOString(),
          },
          ...this.reviews
        ];
        this.reviewForm = { reviewerName: '', reviewMsg: '', rating: 0 };
      },
      error: () => {
        this.reviewSubmitting = false;
        this.reviewError = 'Something went wrong. Please try again.';
      }
    });
  }

  get avgRating(): number {
    if (!this.reviews.length) return 0;
    return this.reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / this.reviews.length;
  }

  getStars(rating: number): { type: 'full' | 'half' | 'empty' }[] {
    return [1, 2, 3, 4, 5].map(i => {
      if (rating >= i)       return { type: 'full' };
      if (rating >= i - 0.5) return { type: 'half' };
      return { type: 'empty' };
    });
  }

  // ─────────────────────────────────────────────
  // IMAGE HELPERS
  // ─────────────────────────────────────────────

  private setupImages(product: any): void {
    if (product.productImages && product.productImages.length > 0) {
      this.images = product.productImages.map((img: any) => this.resolveUrl(img.imageUrl));
    } else {
      this.images = [];
    }
    this.activeImage = this.images[0] || '';
  }

  private resolveUrl(url: string): string {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return `${environment.imageBaseUrl}${url}`;
  }

  private resolveImage(product: any): string {
    if (!product.productImages || product.productImages.length === 0) return '';
    return this.resolveUrl(product.productImages[0].imageUrl);
  }

  setActiveImage(index: number): void {
    this.activeImageIndex = index;
    this.activeImage      = this.images[index];
  }

  nextImage(): void {
    const next = (this.activeImageIndex + 1) % this.images.length;
    this.setActiveImage(next);
  }

  prevImage(): void {
    const prev = (this.activeImageIndex - 1 + this.images.length) % this.images.length;
    this.setActiveImage(prev);
  }

  // ─────────────────────────────────────────────
  // VARIANTS
  // ─────────────────────────────────────────────

  private setupVariants(product: any): void {
    if (product.variants && product.variants.length > 0) {
      this.sizes = product.variants.map((v: any) => v.size);
      const firstAvailable = product.variants.find((v: any) => v.stock > 0);
      if (firstAvailable) this.selectedSize = firstAvailable.size;
    } else {
      this.sizes = [];
    }
  }

  get selectedVariant(): any {
    if (!this.product?.variants || !this.selectedSize) return null;
    return this.product.variants.find((v: any) => v.size === this.selectedSize) ?? null;
  }

  get displayPrice(): string {
    if (this.selectedVariant) return `₹${this.selectedVariant.price}`;
    const prices = this.product?.variants?.map((v: any) => v.price) ?? [];
    if (!prices.length) return '';
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    return min === max ? `₹${min}` : `₹${min} – ₹${max}`;
  }

  get currentStock(): number {
    return this.selectedVariant?.stock ?? 0;
  }

  get isFullyOutOfStock(): boolean {
    const variants = this.product?.variants;
    if (!variants?.length) return false;
    return variants.every((v: any) => v.stock === 0);
  }

  get isSelectedOutOfStock(): boolean {
    if (this.selectedVariant) return this.selectedVariant.stock === 0;
    return this.isFullyOutOfStock;
  }

  get stockLabel(): string {
    if (!this.selectedVariant) return '';
    if (this.selectedVariant.stock === 0) return 'Sold Out';
    if (this.selectedVariant.stock <= 5)  return `Only ${this.selectedVariant.stock} left!`;
    return `${this.selectedVariant.stock} available`;
  }

  get stockClass(): string {
    if (!this.selectedVariant) return '';
    if (this.selectedVariant.stock === 0) return 'out-stock';
    if (this.selectedVariant.stock <= 5)  return 'low-stock';
    return 'in-stock';
  }

  // ─────────────────────────────────────────────
  // SELECTORS
  // ─────────────────────────────────────────────

  selectSize(size: string): void {
    this.selectedSize = size;
    this.qty = 1;
  }

  selectColor(color: string): void { this.selectedColor = color; }

  incrementQty(): void { if (this.qty < this.currentStock) this.qty++; }
  decrementQty(): void { if (this.qty > 1) this.qty--; }

  // ─────────────────────────────────────────────
  // CART
  // ─────────────────────────────────────────────

  
addToCart(): void {
  if (!this.product || !this.selectedSize) return;

  const variantId = this.selectedVariant?.id;
  if (!variantId) return;

  // Already cart mein hai → qty update karo (increment)
  if (this.cartService.isInCart(variantId)) {
    // qty baar baar increment karo jitni user ne select ki
    for (let i = 0; i < this.qty; i++) {
      this.cartService.increment(variantId);
    }
    this.addedToCart = true;
    setTimeout(() => (this.addedToCart = false), 2500);
    return;
  }

  // Naya item — addItem() call karo with selected qty
  this.cartService.addItem(variantId, this.qty).subscribe({
    next: () => {
      this.addedToCart = true;
      setTimeout(() => (this.addedToCart = false), 2500);
    },
    error: () => {
      // Optional: error toast dikha sakte ho
      console.error('Cart mein add nahi hua');
    }
  });
}

  // ─────────────────────────────────────────────
  // ROUTING
  // ─────────────────────────────────────────────

  goToProduct(id: number | string): void {
    this.router.navigate(['/products', id]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ─────────────────────────────────────────────
  // UTILS
  // ─────────────────────────────────────────────

  getDiscount(): number {
    const p = this.product as any;
    if (!p?.originalPrice || !p?.price) return 0;
    return Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100);
  }

  getVariantPriceRange(variants: any[]): string {
    if (!variants?.length) return '';
    const prices = variants.map(v => v.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    return min === max ? `₹${min}` : `₹${min} – ₹${max}`;
  }

  private checkIfNew(product: any): void {
    if (!product.createdAt) return;
    const created  = new Date(product.createdAt);
    const diffDays = (Date.now() - created.getTime()) / (1000 * 60 * 60 * 24);
    this.isNew = diffDays <= 30;
  }
}
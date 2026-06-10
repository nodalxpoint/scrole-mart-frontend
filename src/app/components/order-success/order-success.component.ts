// src/app/components/order-success/order-success.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule }      from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CartService }       from '../../services/cart.service';
import { catchError, of }    from 'rxjs';

@Component({
  selector:    'app-order-success',
  standalone:  true,
  imports:     [CommonModule, RouterLink],
  templateUrl: './order-success.component.html',
  styleUrl:    './order-success.component.css',
})
export class OrderSuccessComponent implements OnInit {

  verifying       = true;
  paymentStatus: 'succeeded' | 'failed' | 'processing' = 'failed';
  paymentIntentId = '';
  orderId: string | null = null;
  errorMessage    = '';
  confettiDots    = Array(12).fill(0);

  constructor(
    private route:       ActivatedRoute,
    private router:      Router,
    private cartService: CartService,
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {

      // Razorpay: checkout.component navigates with { payment_id, status }
      const paymentId = params['payment_id'] || '';
      const status    = params['status']     || '';

      // ── SUCCESS: Razorpay payment confirmed ──
      if (status === 'succeeded' && paymentId) {
        this.paymentIntentId = paymentId;
        this.paymentStatus   = 'succeeded';
        this.verifying       = false;
        // Cart already cleared in checkout.component → clearCart here is a safety net
        this.cartService.clearCart().pipe(catchError(() => of(null))).subscribe();
        return;
      }

      // ── PROCESSING: payment captured but webhook pending ──
      if (status === 'processing') {
        this.paymentStatus = 'processing';
        this.verifying     = false;
        return;
      }

      // ── FAILED: explicit failure ──
      if (status === 'failed') {
        this.paymentStatus = 'failed';
        this.errorMessage  = 'Payment was not completed. No amount was charged.';
        this.verifying     = false;
        return;
      }

      // ── UNKNOWN: direct URL access or missing params ──
      this.paymentStatus = 'failed';
      this.errorMessage  = 'No payment information found.';
      this.verifying     = false;
    });
  }

  retryCheckout(): void {
    this.router.navigate(['/checkout']);
  }
}
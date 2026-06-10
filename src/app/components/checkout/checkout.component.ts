// src/app/components/checkout/checkout.component.ts
import {
  Component, OnInit, OnDestroy, NgZone, ChangeDetectorRef
} from '@angular/core';
import { CommonModule }   from '@angular/common';
import { Router }         from '@angular/router';
import { HttpClient }     from '@angular/common/http';
import { Subscription }   from 'rxjs';
import { catchError, of } from 'rxjs';

import { CartService, CartItem } from '../../services/cart.service';
import { GuestService }          from '../../services/guest.service';
import { environment }           from '../../../environments/environments';

import { CheckoutStepsComponent }   from './checkout-steps/checkout-steps.component';
import { ShippingFormComponent }    from './shipping-form/shipping-form.component';
import { PaymentFormComponent }     from './payment-form/payment-form.component';
import { OrderSummaryComponent }    from './order-summary/order-summary.component';

export interface CheckoutForm {
  fullName:      string;
  email:         string;
  phone:         string;
  addressLine1:  string;
  addressLine2?: string;
  city:          string;
  state:         string;
  pincode:       string;
}

export interface CheckoutResponse {
  razorpayOrderId: string;
  amount:          number;
  currency:        string;
}

declare var Razorpay: any;

@Component({
  selector:    'app-checkout',
  standalone:  true,
  imports: [
    CommonModule,
    CheckoutStepsComponent,
    ShippingFormComponent,
    PaymentFormComponent,
    OrderSummaryComponent,
  ],
  templateUrl: './checkout.component.html',
  styleUrl:    './checkout.component.css',
})
export class Checkout implements OnInit, OnDestroy {

  cartItems: CartItem[] = [];
  subtotal  = 0;
  shipping  = 0;
  total     = 0;

  form: CheckoutForm = {
    fullName: '', email: '', phone: '',
    addressLine1: '', addressLine2: '',
    city: '', state: '', pincode: '',
  };

  currentStep: 1 | 2 = 1;
  errorMessage       = '';
  loading            = false;
  razorpayOrderId    = '';

  private cartSub!: Subscription;

  constructor(
    private cartService:  CartService,
    private guestService: GuestService,
    private http:         HttpClient,
    private router:       Router,
    public  ngZone:       NgZone,
    public  cdr:          ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.cartSub = this.cartService.cart$.subscribe(items => {
      this.cartItems = items;
      this.calculateTotals();
    });

    if (this.cartService.getTotalCount() === 0) {
      this.router.navigate(['/cart']);
    }

    this.preloadRazorpay();
  }

  ngOnDestroy(): void {
    this.cartSub?.unsubscribe();
  }

  onShippingSubmitted(formData: CheckoutForm): void {
    this.form         = formData;
    this.errorMessage = '';
    this.loading      = true;

    const payload = {
      guestId:  this.guestService.getGuestId(),
      amount:   this.total,
      currency: 'INR',
      name:     this.form.fullName,
      address:  this.buildAddress(),
      email:    this.form.email,
      phone:    this.form.phone,
    };

    this.http.post<CheckoutResponse>(
      `${environment.apiUrl}/order/create-guestorder`, payload
    ).subscribe({
      next: (res) => {
        this.loading = false;
        if (!res?.razorpayOrderId) {
          this.errorMessage = 'Could not initiate payment. Please try again.';
          return;
        }
        this.razorpayOrderId = res.razorpayOrderId;
        this.currentStep     = 2;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.loading      = false;
        this.errorMessage = err?.error?.message || err?.error || 'Something went wrong. Please try again.';
      },
    });
  }

  onPaymentSuccess(paymentData: { razorpay_payment_id: string }): void {
    this.ngZone.run(() => {
      this.cartService.clearCart()
        .pipe(catchError(() => of(null)))
        .subscribe(() => {
          this.router.navigate(['/order-success'], {
            queryParams: {
              payment_id: paymentData.razorpay_payment_id,
              status:     'succeeded'
            }
          });
        });
    });
  }

  onPaymentFailed(message: string): void {
    this.errorMessage = message;
    this.cdr.detectChanges();
  }

  goBackToShipping(): void {
    this.currentStep     = 1;
    this.errorMessage    = '';
    this.razorpayOrderId = '';
    this.cdr.detectChanges();
  }

  private buildAddress(): string {
    const { addressLine1, addressLine2, city, state, pincode } = this.form;
    return `${addressLine1}${addressLine2 ? ', ' + addressLine2 : ''}, ${city}, ${state} - ${pincode}`;
  }

  private calculateTotals(): void {
    this.subtotal = this.cartService.getTotalPrice();
    this.shipping = 0;
    this.total    = +this.subtotal.toFixed(2);
  }

  private preloadRazorpay(): void {
    if ((window as any).Razorpay) return;
    const s   = document.createElement('script');
    s.src     = 'https://checkout.razorpay.com/v1/checkout.js';
    s.async   = true;
    document.head.appendChild(s);
  }
}
// src/app/components/checkout/payment-form/payment-form.component.ts
import {
  Component, Input, Output, EventEmitter,
  OnDestroy, AfterViewInit, NgZone, ChangeDetectorRef
} from '@angular/core';
import { CommonModule }  from '@angular/common';
import { CheckoutForm }  from '../checkout.component';
import { environment }   from '../../../../environments/environments';

declare var Razorpay: any;

export type ErrorType = 'declined' | 'validation' | 'generic' | null;

@Component({
  selector:    'app-payment-form',
  standalone:  true,
  imports:     [CommonModule],
  templateUrl: './payment-form.component.html',
  styleUrl:    './payment-form.component.css',
})
export class PaymentFormComponent implements AfterViewInit, OnDestroy {

  @Input()  form!:            CheckoutForm;
  @Input()  razorpayOrderId!: string;
  @Input()  total = 0;

  @Output() goBack         = new EventEmitter<void>();
  @Output() paymentSuccess = new EventEmitter<{ razorpay_payment_id: string }>();
  @Output() paymentFailed  = new EventEmitter<string>();

  paymentReady   = true;
  paymentLoading = false;
  errorMessage   = '';
  errorType: ErrorType = null;

  private paymentSucceeded = false;
  private dismissTimer: any = null;

  constructor(private ngZone: NgZone, private cdr: ChangeDetectorRef) {}

  ngAfterViewInit(): void {}

  ngOnDestroy(): void {
    if (this.dismissTimer) clearTimeout(this.dismissTimer);
  }

  confirmPayment(): void {
    if (this.paymentLoading) return;

    this.paymentLoading   = true;
    this.errorMessage     = '';
    this.errorType        = null;
    this.paymentSucceeded = false;

    if (this.dismissTimer) {
      clearTimeout(this.dismissTimer);
      this.dismissTimer = null;
    }

    const options = {
      key:         environment.razorpayKeyId,
      amount:      this.total * 100,
      currency:    'INR',
      name:        'Khilat Kurtis',
      description: 'Order Payment',
      order_id:    this.razorpayOrderId,
      prefill: {
        name:    this.form.fullName,
        email:   this.form.email,
        contact: this.form.phone,
      },
      theme: {
        color: '#FF9494'
      },

      handler: (response: any) => {
        this.paymentSucceeded = true;
        if (this.dismissTimer) {
          clearTimeout(this.dismissTimer);
          this.dismissTimer = null;
        }
        this.ngZone.run(() => {
          this.paymentLoading = false;
          this.paymentSuccess.emit({
            razorpay_payment_id: response.razorpay_payment_id
          });
          this.cdr.detectChanges();
        });
      },

      modal: {
        ondismiss: () => {
          // NET BANKING FIX:
          // Punjab Bank aur doosre net banking flows mein Razorpay popup close
          // ho jaata hai (ondismiss fire) PEHLE jab bank redirect complete ho —
          // handler baad mein fire hota hai. Isliye 3 second ka grace period diya
          // hai — agar handler fire ho gaya to dismissTimer cancel ho jaayega.
          this.dismissTimer = setTimeout(() => {
            if (this.paymentSucceeded) return;
            this.ngZone.run(() => {
              this.paymentLoading = false;
              this.errorType      = 'generic';
              this.errorMessage   = 'Payment cancelled or not completed. If your amount was deducted, it will be refunded within 5–7 business days.';
              this.cdr.detectChanges();
            });
          }, 3000);
        }
      }
    };

    try {
      const rzp = new Razorpay(options);

      rzp.on('payment.failed', (response: any) => {
        if (this.dismissTimer) {
          clearTimeout(this.dismissTimer);
          this.dismissTimer = null;
        }
        this.ngZone.run(() => {
          this.paymentLoading = false;
          this.errorType      = 'declined';
          this.errorMessage   = response.error?.description
            || 'Payment failed. Please try again.';
          this.paymentFailed.emit(this.errorMessage);
          this.cdr.detectChanges();
        });
      });

      rzp.open();

    } catch (e) {
      this.paymentLoading = false;
      this.errorType      = 'generic';
      this.errorMessage   = 'Could not open payment window. Please refresh and try again.';
      this.cdr.detectChanges();
    }
  }

  onGoBack(): void {
    this.goBack.emit();
  }
}
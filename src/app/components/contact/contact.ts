// contact/contact.component.ts
import { Component, AfterViewInit } from '@angular/core';
import { CommonModule }             from '@angular/common';
import { FormsModule }              from '@angular/forms';
import { HttpClient }               from '@angular/common/http';
import { environment }              from '../../../environments/environments';

@Component({
  selector:    'app-contact',
  standalone:  true,
  imports:     [CommonModule, FormsModule],
  templateUrl: './contact.html',
  styleUrl:    './contact.css'
})
export class Contact implements AfterViewInit {

  // Form fields
  trckngKey = '';   // Tracking Key — sent uppercase
  name      = '';
  phone     = '';
  email     = '';

  // UI state
  sending           = false;
  submitted         = false;
  showDispatchPopup = false;
  errorMsg          = '';

  constructor(private http: HttpClient) {}

  ngAfterViewInit(): void {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });
    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
  }

  onSubmit(): void {
    if (this.sending) return;
    this.sending  = true;
    this.errorMsg = '';

    const payload = {
      trckngKey: this.trckngKey.trim().toUpperCase(),
      name:      this.name.trim(),
      email:     this.email.trim(),
    };

    this.http
      .post(`${environment.apiUrl}/order/cancel-order`, payload, { responseType: 'text' })
      .subscribe({
        next: () => {
          this.sending   = false;
          this.submitted = true;
        },
        error: (err) => {
          this.sending = false;
          const status  = err?.status;
          const raw     = typeof err?.error === 'string' && err.error.length > 0
                            ? err.error
                            : (err?.error?.message ?? err?.message ?? '');
          const message = String(raw).toLowerCase();
          console.log('ERR OBJECT:', err);
          console.log('RAW:', raw);
          console.log('MESSAGE:', message);

          // Order already successfully cancelled
          if (status === 400 && message.includes('cancelled')) {
            this.sending   = false;
            this.submitted = true;
            return;
          }

          // Order already dispatched — show popup
          if (status === 400 && (
            message.includes('dispatch') ||
            message.includes('shipped')  ||
            message.includes('cannot cancel')
          )) {
            this.showDispatchPopup = true;
            return;
          }

          // Wrong details / not found
          if (status === 404 || status === 400) {
            this.errorMsg = 'Order not found. Please check your Tracking Key, Name, and Email — all details must match exactly.';
            return;
          }

          this.errorMsg = 'Something went wrong. Please try again in a moment.';
        }
      });
  }

  closeDispatchPopup(): void { this.showDispatchPopup = false; }

  resetForm(): void {
    this.trckngKey        = '';
    this.name             = '';
    this.phone            = '';
    this.email            = '';
    this.sending          = false;
    this.submitted        = false;
    this.showDispatchPopup = false;
    this.errorMsg         = '';
  }
}
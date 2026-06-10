// offer-strip.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-offer-strip',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './offer-strip.component.html',
  styleUrl: './offer-strip.component.css',
})
export class OfferStripComponent {
 readonly offerItems = [
  'Authentic Lucknowi Chikankari Craft',
  'Handcrafted by Skilled Artisans',
  'Premium Quality Fabrics',
  'Exclusive Limited Edition Designs',
  'Elegant Styles for Every Occasion',
  'Your Every-Day Fashion',
];
}
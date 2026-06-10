// track-order/track-order-result/track-order-result.component.ts
import { Component, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface OrderTrackingResponse {
  status: 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'DISPATCHED' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED' | 'REFUNDED';
  name:   string;
  email:  string;
}

interface TimelineStep {
  label: string;
  desc:  string;
  done:  boolean;
  active: boolean;
}

// Status order for building the timeline
const STATUS_ORDER: OrderTrackingResponse['status'][] = [
  'PENDING',
  'CONFIRMED',
  'PROCESSING',
  'DISPATCHED',
  'OUT_FOR_DELIVERY',
  'DELIVERED'
];

const STATUS_META: Record<string, { label: string; desc: string }> = {
  PENDING:          { label: 'Order Placed',      desc: 'We have received your order' },
  CONFIRMED:        { label: 'Order Confirmed',   desc: 'Your order is confirmed & being reviewed' },
  PROCESSING:       { label: 'Processing',        desc: 'Your kurta is being packed with care' },
  DISPATCHED:       { label: 'Dispatched',        desc: 'Your order has been dispatched' },
  OUT_FOR_DELIVERY: { label: 'Out for Delivery',  desc: 'Your order is almost there!' },
  DELIVERED:        { label: 'Delivered',         desc: 'Enjoy your Khilat Kurti\'s purchase 🌸' },
  CANCELLED:        { label: 'Cancelled',         desc: 'This order has been cancelled' },
  REFUNDED:         { label: 'Refunded',          desc: 'Your refund has been processed successfully' }
};

@Component({
  selector: 'app-track-order-result',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './track-order-result.component.html',
  styleUrl: './track-order-result.component.css'
})
export class TrackOrderResultComponent implements OnChanges {
  @Input() orderData!: OrderTrackingResponse;
  @Input() trackingKey = '';

  timelineSteps: TimelineStep[] = [];
  statusLabel = '';
  statusClass = '';

  ngOnChanges(): void {
    this.buildTimeline();
    this.buildStatusMeta();
  }

  private buildTimeline(): void {
    const current = this.orderData.status;

    // Terminal states — show placed step as done, then the terminal step as active
    if (current === 'CANCELLED') {
      this.timelineSteps = [
        { label: STATUS_META['PENDING'].label,   desc: STATUS_META['PENDING'].desc,   done: true,  active: false },
        { label: STATUS_META['CANCELLED'].label, desc: STATUS_META['CANCELLED'].desc, done: false, active: true  }
      ];
      return;
    }

    if (current === 'REFUNDED') {
      this.timelineSteps = [
        { label: STATUS_META['PENDING'].label,   desc: STATUS_META['PENDING'].desc,   done: true,  active: false },
        { label: STATUS_META['CANCELLED'].label, desc: 'Order was cancelled',          done: true,  active: false },
        { label: STATUS_META['REFUNDED'].label,  desc: STATUS_META['REFUNDED'].desc,  done: false, active: true  }
      ];
      return;
    }

    const currentIdx = STATUS_ORDER.indexOf(current);
    this.timelineSteps = STATUS_ORDER.map((s, i) => ({
      label:  STATUS_META[s].label,
      desc:   STATUS_META[s].desc,
      done:   i < currentIdx,
      active: i === currentIdx
    }));
  }

  private buildStatusMeta(): void {
    const s = this.orderData.status;
    this.statusLabel = STATUS_META[s]?.label ?? s;

    const classMap: Record<string, string> = {
      PENDING:          'pending',
      CONFIRMED:        'confirmed',
      PROCESSING:       'processing',
      DISPATCHED:       'dispatched',
      OUT_FOR_DELIVERY: 'out-for-delivery',
      DELIVERED:        'delivered',
      CANCELLED:        'cancelled',
      REFUNDED:         'refunded'
    };
    this.statusClass = classMap[s] ?? 'pending';
  }
}
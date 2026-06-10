// admin/admin-layout/admin-layout.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterOutlet, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { Subscription, filter } from 'rxjs';

interface MenuItem {
  id?: string;
  label: string;
  icon?: string;
  route?: string;
  action?: string;
}

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterOutlet, RouterLinkActive],
  templateUrl: './admin-layout.component.html',
  styleUrl: './admin-layout.component.css',
})
export class AdminLayoutComponent implements OnInit, OnDestroy {
  sidebarCollapsed  = false;
  mobileSidebarOpen = false;

  adminEmail    = localStorage.getItem('admin_email') || 'admin@khilatkurti.com';
  adminInitials = this.getInitials(this.adminEmail);

  currentPageTitle = 'Dashboard';
  today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day:     'numeric',
    month:   'long',
    year:    'numeric',
  });

  menuItems: MenuItem[] = [
    { id: 'dashboard',  label: 'Dashboard',  route: '/admin/dashboard'  },
    { id: 'products',   label: 'Products',   route: '/admin/products'   },
    { id: 'orders',     label: 'Orders',     route: '/admin/orders'     },
    { id: 'dispatched', label: 'Dispatched', route: '/admin/dispatched' },
    { id: 'delivered',  label: 'Delivered',  route: '/admin/delivered'  },
    { id: 'refunded',   label: 'Refunded',   route: '/admin/cancelled'  },
    { id: 'categories', label: 'Categories', route: '/admin/categories' },
    { id: 'logout',     label: 'Logout',     action: 'logout'           },
  ];

  private routerSub!: Subscription;

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.routerSub = this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd))
      .subscribe(() => this.updatePageTitle());
    this.updatePageTitle();
  }

  ngOnDestroy(): void { this.routerSub?.unsubscribe(); }

  toggleSidebar():       void { this.sidebarCollapsed  = !this.sidebarCollapsed; }
  toggleMobileSidebar(): void { this.mobileSidebarOpen = !this.mobileSidebarOpen; }
  closeMobileSidebar():  void { this.mobileSidebarOpen = false; }

  logout(): void {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_email');
    this.router.navigate(['/admin/login']);
  }

  private updatePageTitle(): void {
    const url   = this.router.url;
    const match = this.menuItems.find(item => item.route && url.startsWith(item.route));
    this.currentPageTitle = match?.label || 'Admin Panel';
  }

  private getInitials(email: string): string {
    const name = email.split('@')[0];
    return name.substring(0, 2).toUpperCase();
  }
}
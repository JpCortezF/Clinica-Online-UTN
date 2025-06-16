import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { UserService } from '../../services/user.service';
import { filter } from 'rxjs';
import { initFlowbite } from 'flowbite';

@Component({
  selector: 'app-account',
  imports: [CommonModule, RouterLink],
  templateUrl: './account.component.html',
  styleUrl: './account.component.css'
})
export class AccountComponent {
  user: any = null;
  auth = inject(AuthService);
  userSession = inject(UserService);
  router = inject(Router);
  isLoading = true;

  ngOnInit(): void {
    this.auth.currentUser$.subscribe(async user => {
      if (user) {
        const userData = await this.auth.getLoggedUserData();
        this.user = userData;
      }
      this.isLoading = false;
    });

    setTimeout(() => initFlowbite(), 100);
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      setTimeout(() => initFlowbite(), 100);
    });
  }
}

import { Component, inject } from '@angular/core';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { CommonModule } from '@angular/common';
import { initFlowbite } from 'flowbite';
import { filter } from 'rxjs';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, CommonModule],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css'
})

export class NavbarComponent {
  user: any = null;
  auth = inject(AuthService);
  router = inject(Router);

  ngOnInit(): void {
    this.auth.currentUser$.subscribe(user => {
      if (user) {
        this.auth.getLoggedUserData().then(userData => {
          this.user = userData;
        }); 
      }
      setTimeout(() => initFlowbite(), 0);
    });

    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      setTimeout(() => initFlowbite(), 300);
    });
  }

  logout() {
    this.auth.logout().then(() => {
      this.user = null;
      this.router.navigate(['/login']);
    });
  }
}

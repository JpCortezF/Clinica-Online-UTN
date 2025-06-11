import { Component, inject } from '@angular/core';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { CommonModule } from '@angular/common';
import { initFlowbite } from 'flowbite';
import { filter } from 'rxjs';
import { UserService } from '../../../services/user.service';

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
  userSession = inject(UserService);

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

  goToProfile() {
    if (this.user) {
      this.userSession.setUser(this.user);
      if(this.user.user_type === 'specialist')
      this.router.navigate(['/specialist-profile']);
    }
  }

  goToAppointment() {
    if (this.user) {
      this.userSession.setUser(this.user);
      this.router.navigate(['/appointment']);
    }
  }

  goToServices() {
      const currentRoute = this.router.url.split('#')[0]; // Obtiene la ruta actual sin el fragmento
      if (currentRoute !== '/') {
        this.router.navigate(['/'], { fragment: 'services-section' });
      }else{
        const element = document.getElementById('services-section');
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }
  }

  logout() {
    this.auth.logout().then(() => {
      this.user = null;
      this.router.navigate(['/login']);
    });
  }
}

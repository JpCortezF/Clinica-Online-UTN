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
  user: any | null = null;
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
      if(this.user.user_type === 'specialist'){
        this.router.navigate(['/specialist-profile']);
      }
      else if(this.user.user_type === 'patient'){
        this.router.navigate(['/patients-profile']);
      }
    }
  }

  goToAppointment() {
    if (this.user) {
      this.userSession.setUser(this.user);
      this.router.navigate(['/appointment']);
    }
  }

  goToPatients() {
    if (this.user) {
      this.userSession.setUser(this.user);
      this.router.navigate(['/patients-section']);
    }
  }

  goToServices() {
      const currentRoute = this.router.url.split('#')[0];
      if (currentRoute !== '/') {
        this.router.navigate(['/'], { fragment: 'services-section' });
      }else{
        const element = document.getElementById('services-section');
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }
  }

  goToUserSection() {
    if (this.user) {
      this.userSession.setUser(this.user);
      this.router.navigate(['/user-section']);
    }
  }

  goToUserRegistration() {
    if (this.user) {
      this.userSession.setUser(this.user);
      this.router.navigate(['/account']);
    }
  }

  goToStatstics() {
    if (this.user) {
      this.userSession.setUser(this.user);
      this.router.navigate(['/statstics']);
    }
  }

  logout() {
    this.auth.logout().then(() => {
      this.user = null;
      this.router.navigate(['/login']);
    });
  }
}

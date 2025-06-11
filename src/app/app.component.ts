import { Component, inject } from '@angular/core';
import { NavigationEnd, Router, RouterModule, RouterOutlet } from '@angular/router';
import { initFlowbite } from 'flowbite';
import { NavbarComponent } from "./components/general-components/navbar/navbar.component";
import { FooterComponent } from "./components/general-components/footer/footer.component";
import { AuthService } from './services/auth.service';
import { UserService } from './services/user.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterModule, NavbarComponent, FooterComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'Clinica_online';
  auth = inject(AuthService);
  userSession = inject(UserService);

  constructor(private router: Router) {}

  async ngOnInit() {
    initFlowbite();
    await this.auth.authReady;

    const user = await this.auth.getLoggedUserData();
    if (user) {
      this.userSession.setUser(user);
    }

    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        window.scrollTo(0, 0);
      }
    });
  }
}

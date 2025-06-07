import { Component, inject, Inject } from '@angular/core';
import { CarouselComponent } from "../../components/home-componenets/carousel/carousel.component";
import { CardsComponent } from "../../components/home-componenets/cards/cards.component";
import { SeparatorComponent } from "../../components/home-componenets/separator/separator.component";
import { DataInformationComponent } from "../../components/home-componenets/data-information/data-information.component";
import { DatabaseService } from '../../services/database.service';
import { ClinicaServices } from '../../classes/clinica-services';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-home',
  imports: [CarouselComponent, CardsComponent, SeparatorComponent, DataInformationComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent {
  db = inject(DatabaseService);
  auth = inject(AuthService);
  clinica_services: ClinicaServices[] = [];
  isLoading = true;
  
  async ngOnInit() {
    try {
      this.clinica_services = await this.db.getClinicaServices();
    } catch (error) {
      console.error('Error fetching clinica services:', error);
    } finally {
      this.isLoading = false;
    }
  }
}

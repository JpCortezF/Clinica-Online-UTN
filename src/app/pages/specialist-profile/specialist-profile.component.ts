import { Component, inject } from '@angular/core';
import { DatabaseService } from '../../services/database.service';
import { UserService } from '../../services/user.service';
import { CommonModule } from '@angular/common';
import { EditOfficeHoursComponent } from "../../components/profile-components/edit-office-hours/edit-office-hours.component";

@Component({
  selector: 'app-specialist-profile',
  imports: [CommonModule, EditOfficeHoursComponent],
  templateUrl: './specialist-profile.component.html',
  styleUrl: './specialist-profile.component.css'
})
export class SpecialistProfileComponent {
  db = inject(DatabaseService);
  userSession = inject(UserService);
  user: any = null;
  specialties: string[] = [];
  isLoading = true;
  
  isModalOpen = false;
  officeHours: any = {};

  async ngOnInit() {
    while (!this.userSession.getUser()) {
      await new Promise(r => setTimeout(r, 50));
    }

    this.user = this.userSession.getUser();
    if (this.user?.user_type === 'specialist') {
      this.specialties = await this.db.getSpecialtiesForUser(this.user.id);
      this.officeHours = await this.db.getOfficeHoursByUserId(this.user.id);
    }
    this.isLoading = false;
  }

  toggleModal() {
    this.isModalOpen = !this.isModalOpen;
  }

  async handleSave(updatedHours: any) {
    if (!this.user) return;
    await this.db.updateOfficeHours(this.user.id, updatedHours);
    this.officeHours = updatedHours;
    this.isModalOpen = false;
  }

  getFormattedDays(): string {
    const daysOrder = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    const labels: any = {
      lunes: 'Lunes', martes: 'Martes', miércoles: 'Miércoles',
      jueves: 'Jueves', viernes: 'Viernes', sábado: 'Sábado'
    };
    return Object.keys(this.officeHours)
      .sort((a, b) => daysOrder.indexOf(a) - daysOrder.indexOf(b))
      .map(day => labels[day])
      .join(' - ');
  }

  getFormattedRange(): string {
    const allHours = Object.values(this.officeHours);
    if (allHours.length === 0) return '';

    const startTimes = allHours.map((h: any) => h.start);
    const endTimes = allHours.map((h: any) => h.end);

    const minStart = startTimes.reduce((a, b) => (a < b ? a : b));
    const maxEnd = endTimes.reduce((a, b) => (a > b ? a : b));

    return `${minStart} a ${maxEnd} hs`;
  }

  hasOfficeHours(): boolean {
    return this.officeHours && Object.keys(this.officeHours).length > 0;
  }
}

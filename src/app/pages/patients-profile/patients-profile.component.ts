import { Component, inject } from '@angular/core';
import { UserService } from '../../services/user.service';
import { DatabaseService } from '../../services/database.service';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-patients-profile',
  imports: [CommonModule],
  templateUrl: './patients-profile.component.html',
  styleUrl: './patients-profile.component.css'
})
export class PatientProfileComponent {
  db = inject(DatabaseService);
  userSession = inject(UserService);
  auth = inject(AuthService);

  user: any = null;
  patient: any = null;
  isLoading = true;

  async ngOnInit() {
    while (!this.userSession.getUser()) {
      await new Promise(r => setTimeout(r, 50));
    }

    this.user = this.userSession.getUser();

    if (this.user?.user_type === 'patient') {
      this.patient  = await this.db.getPatientProfileData(this.user.id);
    }

    this.isLoading = false;
  }
}

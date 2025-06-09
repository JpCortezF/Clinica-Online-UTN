import { CommonModule } from '@angular/common';
import { Component, inject, Input } from '@angular/core';
import { DatabaseService } from '../../services/database.service';
import { UserService } from '../../services/user.service';

@Component({
  selector: 'app-profile',
  imports: [CommonModule],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css'
})
export class ProfileComponent {
  db = inject(DatabaseService);
  userSession = inject(UserService);
  user: any = null;
  specialties: string[] = [];

  async ngOnInit() {
    this.user = this.userSession.getUser();

    if (this.user?.user_type === 'specialist') {
      this.specialties = await this.db.getSpecialtiesForUser(this.user.id);
    }
  }
}

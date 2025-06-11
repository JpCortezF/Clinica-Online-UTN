import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private currentUser: any = null;
  
  setUser(user: any) {
    this.currentUser = user;
  }

  getUser(): any {
    return this.currentUser;
  }
}

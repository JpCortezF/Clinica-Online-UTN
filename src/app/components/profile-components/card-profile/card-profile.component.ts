import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-card-profile',
  imports: [CommonModule],
  templateUrl: './card-profile.component.html',
  styleUrl: './card-profile.component.css'
})
export class CardProfileComponent {
  @Input() profile: any;
  @Input() showDetails: boolean = true;
  @Input() imageSize: string = 'w-20 h-20';
  @Output() clicked = new EventEmitter<void>();
  
  onCardClick() {
    this.clicked.emit();
  }
}
